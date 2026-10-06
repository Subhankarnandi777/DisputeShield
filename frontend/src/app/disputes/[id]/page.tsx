"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import type { Dispute, AuditEntry, WhatIfResult } from "@/lib/types";
import { formatCurrency, formatDateTime, formatDate, reasonLabel } from "@/lib/format";
import AnalysisPanel from "@/components/AnalysisPanel";
import AuditTimeline from "@/components/AuditTimeline";
import DeadlineBadge from "@/components/DeadlineBadge";
import StatusBadge from "@/components/StatusBadge";

type Tab = "analysis" | "evidence" | "timeline" | "whatif";

export default function DisputeCasePage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [dispute, setDispute] = useState<Dispute | null>(null);
  const [audit, setAudit] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("analysis");

  // Draft editing
  const [editingNarrative, setEditingNarrative] = useState(false);
  const [narrativeDraft, setNarrativeDraft] = useState("");
  const [editingMessage, setEditingMessage] = useState(false);
  const [messageDraft, setMessageDraft] = useState("");
  const [tone, setTone] = useState("professional");
  const [savingDraft, setSavingDraft] = useState(false);

  // Approval
  const [approving, setApproving] = useState(false);
  const [approvalAction, setApprovalAction] = useState<"fight" | "accept" | "offer">("fight");
  const [offerAmount, setOfferAmount] = useState("");
  const [showApprovalModal, setShowApprovalModal] = useState(false);

  // What-if
  const [whatIfFee, setWhatIfFee] = useState(20);
  const [whatIfEffort, setWhatIfEffort] = useState(5);
  const [whatIfPWin, setWhatIfPWin] = useState(50);
  const [whatIfResult, setWhatIfResult] = useState<WhatIfResult | null>(null);
  const [whatIfLoading, setWhatIfLoading] = useState(false);

  const load = useCallback(async () => {
    try {
      setError(null);
      const [d, a] = await Promise.all([
        api.getDispute(id),
        api.getAuditLog(id),
      ]);
      setDispute(d);
      setAudit(a);
      setNarrativeDraft(d.evidence_narrative ?? "");
      setMessageDraft(d.buyer_message_draft ?? "");
      setTone(d.tone ?? "professional");
      if (d.p_win != null) setWhatIfPWin(Math.round(d.p_win * 100));
    } catch (e: any) {
      setError(e.message || "Failed to load dispute");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const saveDraft = async () => {
    if (!dispute) return;
    setSavingDraft(true);
    try {
      const updated = await api.patchDraft(id, {
        evidence_narrative: narrativeDraft,
        buyer_message_draft: messageDraft,
        tone,
      });
      setDispute(updated);
      setEditingNarrative(false);
      setEditingMessage(false);
      await load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSavingDraft(false);
    }
  };

  const handleApprove = async () => {
    setApproving(true);
    try {
      await api.approveAction(id, approvalAction, offerAmount ? parseFloat(offerAmount) : undefined);
      setShowApprovalModal(false);
      await load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setApproving(false);
    }
  };

  const handleReject = async () => {
    if (!confirm("Reject this recommendation? The dispute will return to review queue.")) return;
    try {
      await api.rejectAction(id);
      await load();
    } catch (e: any) {
      setError(e.message);
    }
  };

  const runWhatIf = async () => {
    setWhatIfLoading(true);
    try {
      const result = await api.whatIf(id, {
        fee: whatIfFee,
        effort_cost: whatIfEffort,
        p_win_override: whatIfPWin / 100,
      });
      setWhatIfResult(result);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setWhatIfLoading(false);
    }
  };

  const handleExportCase = () => {
    if (!dispute) return;
    const lines = [
      `# DisputeShield Case Report: ${dispute.id}`,
      `Generated: ${new Date().toISOString()}`,
      `Status: ${dispute.status} | Mode: ${dispute.is_simulated ? "Simulated" : "Live Sandbox"}`,
      "",
      "## 1. Case Overview",
      `- **Dispute ID:** ${dispute.id}`,
      `- **Buyer Name:** ${dispute.buyer_name || "N/A"}`,
      `- **Buyer Email:** ${dispute.buyer_email || "N/A"}`,
      `- **Amount:** ${formatCurrency(dispute.amount, dispute.currency)}`,
      `- **Reason:** ${reasonLabel(dispute.reason)} (${dispute.reason})`,
      `- **Created At:** ${formatDate(dispute.create_time)}`,
      `- **Response Deadline:** ${dispute.response_due_date ? formatDateTime(dispute.response_due_date) : "N/A"}`,
      "",
      "## 2. AI Decision Engine Analysis",
      `- **Recommendation:** ${dispute.recommendation ? dispute.recommendation.toUpperCase() : "PENDING"}`,
      `- **Win Probability (P_win):** ${dispute.p_win != null ? `${(dispute.p_win * 100).toFixed(1)}%` : "N/A"}`,
      `- **Break-Even Threshold (p*):** ${dispute.fight_threshold != null ? `${(dispute.fight_threshold * 100).toFixed(1)}%` : "N/A"}`,
      `- **Expected Value (Fight):** ${dispute.ev_fight != null ? formatCurrency(dispute.ev_fight, dispute.currency) : "N/A"}`,
      `- **Confidence Score:** ${dispute.classification_confidence != null ? `${(dispute.classification_confidence * 100).toFixed(0)}%` : "N/A"}`,
      `- **Evidence Strength Score:** ${dispute.evidence_score != null ? `${dispute.evidence_score}/100` : "N/A"}`,
      "",
      "### Decision Rationale",
      dispute.decision_explanation || dispute.classification_rationale || "No rationale recorded.",
      "",
      "## 3. Policy Citations & RAG Retrieval",
    ];

    if (dispute.cited_passages && dispute.cited_passages.length > 0) {
      dispute.cited_passages.forEach((c, idx) => {
        lines.push(`### Citation ${idx + 1}: ${c.source}`);
        lines.push(`> "${c.text}"`);
        lines.push("");
      });
    } else {
      lines.push("No policy citations recorded.");
      lines.push("");
    }

    lines.push("## 4. Drafted Evidence Narrative");
    lines.push("```text");
    lines.push(dispute.evidence_narrative || "No narrative drafted.");
    lines.push("```");
    lines.push("");

    lines.push("## 5. Drafted Buyer Message");
    lines.push(`*Selected Tone:* ${dispute.tone || "professional"}`);
    lines.push("```text");
    lines.push(dispute.buyer_message_draft || "No buyer message drafted.");
    lines.push("```");
    lines.push("");

    lines.push("## 6. Audit Trail");
    if (audit.length > 0) {
      audit.forEach((a) => {
        lines.push(`- **[${formatDateTime(a.timestamp)}]** \`${a.actor.toUpperCase()}\` — ${a.action}: ${a.detail || ""}`);
      });
    } else {
      lines.push("No audit events recorded.");
    }

    const content = lines.join("\n");
    const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `DisputeShield-${dispute.id}.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="loading-state" style={{ marginTop: 80 }}>
        <div className="spinner" style={{ width: 40, height: 40 }} />
        <div>Loading dispute case…</div>
      </div>
    );
  }

  if (error && !dispute) {
    return (
      <div className="page-body">
        <div className="error-state">⚠ {error}</div>
      </div>
    );
  }

  if (!dispute) return null;

  const canApprove = dispute.status === "READY";
  const isResolved = dispute.status === "RESOLVED";

  return (
    <>
      {/* Page header */}
      <div className="page-header gradient-hero">
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
            <Link
              href="/disputes"
              style={{ fontSize: 13, color: "var(--text-muted)", textDecoration: "none" }}
            >
              ← Disputes
            </Link>
          </div>
          <h1 className="page-title">
            {dispute.buyer_name || "Unknown Buyer"} — {reasonLabel(dispute.reason)}
          </h1>
          <div
            className="page-subtitle"
            style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}
          >
            <span style={{ fontFamily: "monospace", fontSize: 12 }}>{dispute.id}</span>
            {dispute.is_simulated && (
              <span className="badge badge-muted" style={{ fontSize: 10 }}>SIMULATED</span>
            )}
            <StatusBadge status={dispute.status} />
            {isResolved && dispute.outcome && (
              <span
                className={`badge ${dispute.outcome === "WON" ? "badge-success" : "badge-danger"}`}
              >
                {dispute.outcome === "WON" ? "🏆 WON" : "❌ LOST"}
              </span>
            )}
          </div>
        </div>
        <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          <button
            onClick={handleExportCase}
            className="btn btn-ghost btn-sm"
            title="Download full case file as Markdown"
            style={{ border: "1px solid var(--border-color)" }}
          >
            📥 Export Case File
          </button>
          <DeadlineBadge due={dispute.response_due_date} />
          <div style={{ fontSize: 22, fontWeight: 800, color: "var(--text-primary)" }}>
            {formatCurrency(dispute.amount, dispute.currency)}
          </div>
        </div>
      </div>

      <div className="page-body">
        {error && (
          <div className="error-state" style={{ marginBottom: 16 }}>⚠ {error}</div>
        )}

        {/* Quick info row */}
        <div
          style={{
            display: "flex",
            gap: 16,
            flexWrap: "wrap",
            marginBottom: 20,
          }}
        >
          {[
            ["Dispute Amount", formatCurrency(dispute.amount, dispute.currency)],
            ["Buyer", dispute.buyer_name || "—"],
            ["Received", formatDate(dispute.create_time)],
            ["Deadline", dispute.response_due_date ? formatDateTime(dispute.response_due_date) : "None"],
            ["AI Recommendation", dispute.recommendation ? (dispute.recommendation === "fight" ? "⚔ Fight" : "✋ Accept") : "Pending"],
          ].map(([label, value]) => (
            <div
              key={label}
              style={{
                background: "var(--bg-card)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-sm)",
                padding: "10px 14px",
                minWidth: 120,
              }}
            >
              <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.5px", color: "var(--text-muted)", marginBottom: 2 }}>
                {label}
              </div>
              <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>{value}</div>
            </div>
          ))}
        </div>

        {/* Approval Action Bar */}
        {canApprove && (
          <div
            style={{
              background: dispute.recommendation === "fight" ? "var(--fight-bg)" : "var(--accept-bg)",
              border: `1px solid ${dispute.recommendation === "fight" ? "rgba(91,108,246,0.3)" : "rgba(245,158,11,0.3)"}`,
              borderRadius: "var(--radius)",
              padding: "16px 20px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 16,
              marginBottom: 20,
              flexWrap: "wrap",
            }}
          >
            <div>
              <div style={{ fontWeight: 700, fontSize: 15, color: "var(--text-primary)", marginBottom: 2 }}>
                {dispute.recommendation === "fight"
                  ? "⚔ AI recommends FIGHTING this dispute"
                  : "✋ AI recommends ACCEPTING (refund is cheaper)"}
              </div>
              <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                Review the analysis below, then approve or reject the recommendation.
                <strong style={{ color: "var(--text-primary)" }}> Every action is audited.</strong>
              </div>
            </div>
            <div style={{ display: "flex", gap: 10, flexShrink: 0 }}>
              <button
                className="btn btn-ghost btn-sm"
                onClick={handleReject}
                id="reject-btn"
              >
                ✗ Reject
              </button>
              <button
                className={`btn btn-sm ${dispute.recommendation === "fight" ? "btn-primary" : "btn-warning"}`}
                onClick={() => {
                  setApprovalAction(dispute.recommendation ?? "fight");
                  setShowApprovalModal(true);
                }}
                id="approve-btn"
              >
                ✓ Approve & Execute
              </button>
            </div>
          </div>
        )}

        {isResolved && (
          <div
            className={`alert ${dispute.outcome === "WON" ? "alert-success" : "alert-danger"}`}
            style={{ marginBottom: 20 }}
          >
            <span>{dispute.outcome === "WON" ? "🏆" : "❌"}</span>
            <div>
              <strong>{dispute.outcome === "WON" ? "Dispute Won!" : "Dispute Lost"}</strong> — 
              Action taken: {dispute.action_taken} · Approved: {formatDateTime(dispute.action_timestamp)}
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="tabs">
          {(["analysis", "evidence", "timeline", "whatif"] as Tab[]).map((t) => (
            <button
              key={t}
              className={`tab ${tab === t ? "active" : ""}`}
              onClick={() => setTab(t)}
              id={`tab-${t}`}
            >
              {t === "analysis" && "🤖 AI Analysis"}
              {t === "evidence" && "📝 Evidence Draft"}
              {t === "timeline" && "📋 Audit Timeline"}
              {t === "whatif" && "🔮 What-If Simulator"}
            </button>
          ))}
        </div>

        {/* Analysis Tab */}
        {tab === "analysis" && <AnalysisPanel dispute={dispute} />}

        {/* Evidence Draft Tab */}
        {tab === "evidence" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {/* Tone selector */}
            <div className="card">
              <div className="section-header">
                <div className="section-title">Message Tone</div>
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                {["professional", "empathetic", "firm"].map((t) => (
                  <button
                    key={t}
                    className={`btn btn-sm ${tone === t ? "btn-primary" : "btn-ghost"}`}
                    onClick={() => setTone(t)}
                    style={{ textTransform: "capitalize" }}
                  >
                    {t === "professional" ? "💼" : t === "empathetic" ? "🤝" : "⚖"} {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Evidence narrative */}
            <div className="card">
              <div className="section-header">
                <div className="section-title">Evidence Narrative</div>
                {!editingNarrative && dispute.status === "READY" && (
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => setEditingNarrative(true)}
                  >
                    ✏ Edit
                  </button>
                )}
              </div>
              {editingNarrative ? (
                <>
                  <textarea
                    value={narrativeDraft}
                    onChange={(e) => setNarrativeDraft(e.target.value)}
                    rows={8}
                    style={{ marginBottom: 12 }}
                  />
                  <div style={{ display: "flex", gap: 10 }}>
                    <button
                      className="btn btn-success btn-sm"
                      onClick={saveDraft}
                      disabled={savingDraft}
                    >
                      {savingDraft ? "Saving…" : "✓ Save"}
                    </button>
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => {
                        setEditingNarrative(false);
                        setNarrativeDraft(dispute.evidence_narrative ?? "");
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </>
              ) : (
                <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.7, whiteSpace: "pre-wrap" }}>
                  {dispute.evidence_narrative || (
                    <span style={{ color: "var(--text-muted)", fontStyle: "italic" }}>
                      No narrative generated yet — complete analysis first.
                    </span>
                  )}
                </p>
              )}
            </div>

            {/* Buyer message draft */}
            <div className="card">
              <div className="section-header">
                <div className="section-title">Buyer Message Draft</div>
                {!editingMessage && dispute.status === "READY" && (
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => setEditingMessage(true)}
                  >
                    ✏ Edit
                  </button>
                )}
              </div>
              {editingMessage ? (
                <>
                  <textarea
                    value={messageDraft}
                    onChange={(e) => setMessageDraft(e.target.value)}
                    rows={6}
                    style={{ marginBottom: 12 }}
                  />
                  <div style={{ display: "flex", gap: 10 }}>
                    <button
                      className="btn btn-success btn-sm"
                      onClick={saveDraft}
                      disabled={savingDraft}
                    >
                      {savingDraft ? "Saving…" : "✓ Save"}
                    </button>
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => {
                        setEditingMessage(false);
                        setMessageDraft(dispute.buyer_message_draft ?? "");
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </>
              ) : (
                <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.7, whiteSpace: "pre-wrap" }}>
                  {dispute.buyer_message_draft || (
                    <span style={{ color: "var(--text-muted)", fontStyle: "italic" }}>
                      No draft generated yet.
                    </span>
                  )}
                </p>
              )}
            </div>

            <div className="alert alert-info">
              <span>ℹ</span>
              <div>
                These drafts are grounded only in known facts from the case data.
                The AI does not invent evidence. Review before approving.
              </div>
            </div>
          </div>
        )}

        {/* Timeline Tab */}
        {tab === "timeline" && (
          <div className="card card-lg">
            <div className="section-title" style={{ marginBottom: 20 }}>Audit Log</div>
            <AuditTimeline entries={audit} />
          </div>
        )}

        {/* What-If Tab */}
        {tab === "whatif" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div className="card card-lg">
              <div className="section-title" style={{ marginBottom: 16 }}>
                🔮 What-If Simulator
              </div>
              <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 20 }}>
                Adjust assumptions to see how the recommendation changes.
                These are labelled as assumptions, not PayPal statistics.
              </p>

              <div className="grid-3" style={{ marginBottom: 20 }}>
                <div className="form-group">
                  <label>Dispute Fee ($) <span className="helper-text">assumption</span></label>
                  <input
                    type="number"
                    value={whatIfFee}
                    onChange={(e) => setWhatIfFee(parseFloat(e.target.value))}
                    min={0}
                    step={1}
                  />
                </div>
                <div className="form-group">
                  <label>Effort Cost ($) <span className="helper-text">assumption</span></label>
                  <input
                    type="number"
                    value={whatIfEffort}
                    onChange={(e) => setWhatIfEffort(parseFloat(e.target.value))}
                    min={0}
                    step={1}
                  />
                </div>
                <div className="form-group">
                  <label>Win Probability (%) <span className="helper-text">override</span></label>
                  <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                    <input
                      type="range"
                      min={2}
                      max={95}
                      value={whatIfPWin}
                      onChange={(e) => setWhatIfPWin(parseInt(e.target.value))}
                    />
                    <span style={{ fontWeight: 700, minWidth: 40, color: "var(--brand-light)" }}>
                      {whatIfPWin}%
                    </span>
                  </div>
                </div>
              </div>

              <button
                className="btn btn-primary"
                onClick={runWhatIf}
                disabled={whatIfLoading}
                id="whatif-run-btn"
              >
                {whatIfLoading ? (
                  <>
                    <span className="spinner" style={{ width: 14, height: 14 }} />
                    Computing…
                  </>
                ) : (
                  "🔮 Run Simulation"
                )}
              </button>
            </div>

            {whatIfResult && (
              <div className="card">
                <div className="section-title" style={{ marginBottom: 12 }}>Simulation Result</div>
                <div
                  style={{
                    padding: "16px",
                    borderRadius: "var(--radius-sm)",
                    background: whatIfResult.recommendation === "fight" ? "var(--fight-bg)" : "var(--accept-bg)",
                    border: `1px solid ${whatIfResult.recommendation === "fight" ? "rgba(91,108,246,0.3)" : "rgba(245,158,11,0.3)"}`,
                    marginBottom: 12,
                  }}
                >
                  <div style={{ fontSize: 18, fontWeight: 800, color: whatIfResult.recommendation === "fight" ? "var(--brand-light)" : "var(--warning)", marginBottom: 4 }}>
                    {whatIfResult.recommendation === "fight" ? "⚔ FIGHT" : "✋ ACCEPT"}
                  </div>
                  <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>
                    EV = <strong style={{ color: whatIfResult.ev_fight > 0 ? "var(--success)" : "var(--danger)" }}>
                      {whatIfResult.ev_fight > 0 ? "+" : ""}${whatIfResult.ev_fight.toFixed(2)}
                    </strong>
                    {" "}· Win prob: <strong>{Math.round(whatIfResult.p_win * 100)}%</strong>
                    {" "}· Break-even: <strong style={{ color: "var(--warning)" }}>{Math.round(whatIfResult.threshold * 100)}%</strong>
                  </div>
                </div>
                <p style={{ fontSize: 12, color: "var(--text-secondary)", fontStyle: "italic" }}>
                  {whatIfResult.explanation}
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Approval Modal */}
      {showApprovalModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.7)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowApprovalModal(false); }}
        >
          <div
            className="card card-lg glass-card"
            style={{ width: "100%", maxWidth: 480, padding: 32 }}
          >
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>
              🔒 Confirm Action
            </h2>
            <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 20 }}>
              This will execute the selected action through PayPal. This action is audited and cannot be undone.
            </p>

            <div className="form-group">
              <label>Action to Execute</label>
              <div style={{ display: "flex", gap: 8 }}>
                {(["fight", "accept", "offer"] as const).map((a) => (
                  <button
                    key={a}
                    className={`btn btn-sm ${approvalAction === a ? "btn-primary" : "btn-ghost"}`}
                    onClick={() => setApprovalAction(a)}
                    style={{ textTransform: "capitalize", flex: 1 }}
                  >
                    {a === "fight" ? "⚔ Fight" : a === "accept" ? "✋ Accept" : "💰 Offer"}
                  </button>
                ))}
              </div>
            </div>

            {approvalAction === "offer" && (
              <div className="form-group">
                <label>Partial Offer Amount ($)</label>
                <input
                  type="number"
                  value={offerAmount}
                  onChange={(e) => setOfferAmount(e.target.value)}
                  placeholder="e.g. 45.00"
                  min={0}
                  step={0.01}
                />
              </div>
            )}

            <div
              className="alert alert-warning"
              style={{ marginBottom: 20 }}
            >
              ⚠ <strong>Human-in-the-loop:</strong> You are approving this action as the merchant.
              The AI drafted it; you are responsible for the final decision.
            </div>

            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button className="btn btn-ghost" onClick={() => setShowApprovalModal(false)}>
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={handleApprove}
                disabled={approving}
                id="confirm-approve-btn"
              >
                {approving ? (
                  <>
                    <span className="spinner" style={{ width: 14, height: 14 }} />
                    Executing…
                  </>
                ) : (
                  "✓ Confirm & Execute"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
