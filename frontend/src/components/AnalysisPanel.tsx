"use client";
import type { Dispute } from "@/lib/types";
import DecisionMeter from "./DecisionMeter";
import EvidenceScorePanel from "./EvidenceEditor";

interface Props {
  dispute: Dispute;
}

function formatCategory(cat: string): string {
  return cat.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function AnalysisPanel({ dispute }: Props) {
  const {
    classification,
    classification_confidence,
    classification_rationale,
    evidence_score,
    evidence_score_breakdown,
    p_win,
    ev_fight,
    fight_threshold,
    recommendation,
    decision_explanation,
    cited_passages,
    missing_evidence,
    prompt_version,
  } = dispute;

  if (dispute.analysis_status === "pending" || dispute.analysis_status === "running") {
    return (
      <div className="loading-state">
        <div className="spinner" style={{ width: 32, height: 32 }} />
        <div>AI analysis in progress…</div>
        <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
          Classification → RAG retrieval → Evidence scoring → Decision
        </div>
      </div>
    );
  }

  if (dispute.analysis_status === "error") {
    return (
      <div className="error-state">
        ⚠ Analysis failed. Check logs for details.
      </div>
    );
  }

  if (!recommendation) {
    return (
      <div className="empty-state">
        <div className="empty-icon">🤖</div>
        <div className="empty-title">No analysis yet</div>
      </div>
    );
  }

  const confidencePct = Math.round((classification_confidence ?? 0) * 100);
  const isFight = recommendation === "fight";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>

      {/* Classification */}
      <div className="card">
        <div className="section-header">
          <div className="section-title">Classification</div>
          <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
            Prompt {prompt_version}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 20 }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
              <span
                className="badge badge-brand"
                style={{ fontSize: 13, padding: "4px 12px" }}
              >
                {formatCategory(classification ?? "")}
              </span>
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color:
                    confidencePct >= 80
                      ? "var(--success)"
                      : confidencePct >= 60
                      ? "var(--warning)"
                      : "var(--danger)",
                }}
              >
                {confidencePct}% confidence
              </span>
            </div>
            {classification_rationale && (
              <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.6 }}>
                {classification_rationale}
              </p>
            )}
          </div>
          {confidencePct < 60 && (
            <div className="alert alert-warning" style={{ maxWidth: 200, fontSize: 12 }}>
              ⚠ Low confidence — merchant input recommended before proceeding
            </div>
          )}
        </div>
      </div>

      {/* Decision */}
      <div className="card">
        <div className="section-header">
          <div className="section-title">Decision Engine</div>
          <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
            EV = p × A − (1−p) × F − E
          </span>
        </div>
        <div style={{ display: "flex", gap: 32, alignItems: "flex-start", flexWrap: "wrap" }}>
          <DecisionMeter
            pWin={p_win ?? 0}
            threshold={fight_threshold ?? 0}
            recommendation={recommendation}
            size="lg"
          />
          <div style={{ flex: 1, minWidth: 200 }}>
            <div
              style={{
                padding: "12px 16px",
                borderRadius: "var(--radius-sm)",
                background: isFight ? "var(--fight-bg)" : "var(--accept-bg)",
                border: `1px solid ${isFight ? "rgba(91,108,246,0.3)" : "rgba(245,158,11,0.3)"}`,
                marginBottom: 14,
              }}
            >
              <div
                style={{
                  fontSize: 18,
                  fontWeight: 800,
                  color: isFight ? "var(--brand-light)" : "var(--warning)",
                  marginBottom: 4,
                }}
              >
                {isFight ? "⚔ Recommendation: FIGHT" : "✋ Recommendation: ACCEPT"}
              </div>
              <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>
                Expected value of fighting:{" "}
                <strong
                  style={{
                    color: (ev_fight ?? 0) > 0 ? "var(--success)" : "var(--danger)",
                  }}
                >
                  {(ev_fight ?? 0) > 0 ? "+" : ""}${(ev_fight ?? 0).toFixed(2)}
                </strong>
              </div>
            </div>
            {decision_explanation && (
              <p style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.6, fontStyle: "italic" }}>
                {decision_explanation}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Evidence Score */}
      {evidence_score !== null && (
        <div className="card">
          <div className="section-title" style={{ marginBottom: 16 }}>Evidence Strength</div>
          <EvidenceScorePanel
            score={evidence_score ?? 0}
            breakdown={evidence_score_breakdown ?? {}}
          />
        </div>
      )}

      {/* Missing Evidence */}
      {missing_evidence.length > 0 && (
        <div className="card">
          <div className="section-title" style={{ marginBottom: 12 }}>
            Missing Evidence ⚠
          </div>
          <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 12 }}>
            The AI identified the following gaps. Gather these before submitting.
          </p>
          {missing_evidence.map((item, i) => (
            <div key={i} className="missing-item">
              <span className="missing-icon">⚠</span>
              <span>{item}</span>
            </div>
          ))}
        </div>
      )}

      {/* Policy Citations */}
      {cited_passages.length > 0 && (
        <div className="card">
          <div className="section-title" style={{ marginBottom: 12 }}>
            Policy Citations (RAG)
          </div>
          <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 12 }}>
            Retrieved from the PayPal policy knowledge base.
          </p>
          {cited_passages.map((c, i) => (
            <div key={i} className="citation-card">
              <div className="citation-source">{c.source}</div>
              <div className="citation-text">"{c.text}"</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
