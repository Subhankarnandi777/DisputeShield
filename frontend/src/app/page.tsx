"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import type { DashboardStats, Dispute } from "@/lib/types";
import StatsCards from "@/components/StatsCards";
import DeadlineBadge from "@/components/DeadlineBadge";
import StatusBadge from "@/components/StatusBadge";
import { formatCurrency, formatDate, reasonLabel } from "@/lib/format";

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [simulating, setSimulating] = useState(false);

  const load = useCallback(async () => {
    try {
      setError(null);
      const [s, d] = await Promise.all([api.getStats(), api.listDisputes()]);
      setStats(s);
      setDisputes(d);
    } catch (e: any) {
      setError(e.message || "Failed to load data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, [load]);

  const handleSimulate = async () => {
    setSimulating(true);
    try {
      await api.simulateDispute();
      await load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSimulating(false);
    }
  };

  const urgentDisputes = disputes.filter((d) => {
    if (!d.response_due_date) return false;
    const hours = (new Date(d.response_due_date).getTime() - Date.now()) / 3600000;
    return hours < 72 && d.status !== "RESOLVED";
  });

  const recentDisputes = disputes.slice(0, 5);

  return (
    <>
      <div className="page-header gradient-hero">
        <div>
          <h1 className="page-title">🛡 DisputeShield Dashboard</h1>
          <div className="page-subtitle">
            AI-powered dispute management for PayPal sellers
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <button
            className="btn btn-primary"
            onClick={handleSimulate}
            disabled={simulating}
            id="simulate-btn"
          >
            {simulating ? (
              <>
                <span className="spinner" style={{ width: 16, height: 16 }} />
                Creating…
              </>
            ) : (
              "⚡ Simulate Dispute"
            )}
          </button>
          <Link href="/disputes" className="btn btn-ghost">
            View All →
          </Link>
        </div>
      </div>

      <div className="page-body">
        {error && (
          <div className="error-state" style={{ marginBottom: 20 }}>
            <span>⚠</span>
            <div>
              <div style={{ fontWeight: 600 }}>Backend unavailable</div>
              <div style={{ fontSize: 12, marginTop: 2 }}>
                {error}. Make sure the FastAPI backend is running on port 8000.
              </div>
            </div>
          </div>
        )}

        {loading ? (
          <div className="loading-state">
            <div className="spinner" style={{ width: 32, height: 32 }} />
            <div>Loading dashboard…</div>
          </div>
        ) : (
          <>
            {/* Judge Quick Start / Hackathon Demo Banner */}
            <div
              style={{
                marginBottom: 24,
                padding: "18px 22px",
                background: "linear-gradient(135deg, rgba(0, 156, 222, 0.12) 0%, rgba(0, 48, 135, 0.25) 100%)",
                border: "1px solid rgba(0, 156, 222, 0.35)",
                borderRadius: "var(--radius-lg)",
                boxShadow: "var(--shadow-md)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                    <span style={{ fontSize: 18 }}>🏆</span>
                    <span style={{ fontWeight: 700, fontSize: 15, color: "var(--text-primary)" }}>
                      Judge Quick Start & 1-Minute Evaluation Tour
                    </span>
                    <span className="badge badge-brand" style={{ fontSize: 10 }}>P0 EVALUATION</span>
                  </div>
                  <div style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.6, maxWidth: 840 }}>
                    Experience both sides of DisputeShield&apos;s <strong>money-aware decision engine</strong>:
                    an item-not-received case where fighting has positive expected value (+EV), and a low-margin dispute
                    where the AI correctly recommends refunding to save fee & effort costs.
                  </div>
                </div>

                <div style={{ display: "flex", gap: 10, flexShrink: 0 }}>
                  <button
                    className="btn btn-primary"
                    onClick={async () => {
                      setSimulating(true);
                      try {
                        await api.simulateDispute();
                        await load();
                      } finally {
                        setSimulating(false);
                      }
                    }}
                    disabled={simulating}
                  >
                    {simulating ? "Generating Cases…" : "🚀 Seed Demo Cases"}
                  </button>
                  <Link href="/demo-store" className="btn btn-ghost" style={{ border: "1px solid var(--border-color)" }}>
                    🛒 Demo Storefront
                  </Link>
                </div>
              </div>

              {/* 3 Steps indicator */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                  gap: 12,
                  marginTop: 16,
                  paddingTop: 14,
                  borderTop: "1px solid rgba(255, 255, 255, 0.08)",
                }}
              >
                <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                  <span style={{ background: "var(--brand)", color: "#fff", width: 20, height: 20, borderRadius: "50%", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, flexShrink: 0 }}>1</span>
                  <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                    <strong style={{ color: "var(--text-primary)" }}>Seed or capture:</strong> Simulate or trigger via PayPal webhook in the Demo Store.
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                  <span style={{ background: "var(--brand)", color: "#fff", width: 20, height: 20, borderRadius: "50%", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, flexShrink: 0 }}>2</span>
                  <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                    <strong style={{ color: "var(--text-primary)" }}>Inspect AI Reasoning:</strong> Grounded RAG citations, evidence rubric score, and EV meter.
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                  <span style={{ background: "var(--brand)", color: "#fff", width: 20, height: 20, borderRadius: "50%", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, flexShrink: 0 }}>3</span>
                  <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                    <strong style={{ color: "var(--text-primary)" }}>Human in the Loop:</strong> Edit narrative tone, then one-click Approve & execute with full audit trail.
                  </div>
                </div>
              </div>
            </div>

            {/* Stats cards */}
            {stats && <StatsCards stats={stats} />}

            {/* Main content grid */}
            <div className="grid-2" style={{ gap: 24 }}>
              {/* Urgent disputes */}
              <div className="card card-lg">
                <div className="section-header">
                  <div className="section-title">🔴 Urgent — Act Soon</div>
                  {urgentDisputes.length > 0 && (
                    <span className="badge badge-danger">{urgentDisputes.length}</span>
                  )}
                </div>
                {urgentDisputes.length === 0 ? (
                  <div className="empty-state" style={{ padding: "30px 0" }}>
                    <div style={{ fontSize: 28 }}>✅</div>
                    <div className="empty-title">No urgent deadlines</div>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {urgentDisputes.map((d) => (
                      <Link
                        key={d.id}
                        href={`/disputes/${d.id}`}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          padding: "12px 14px",
                          background: "var(--bg-elevated)",
                          borderRadius: "var(--radius-sm)",
                          border: "1px solid var(--danger-border)",
                          textDecoration: "none",
                          transition: "background 0.15s",
                        }}
                        onMouseEnter={(e) =>
                          (e.currentTarget.style.background = "var(--danger-bg)")
                        }
                        onMouseLeave={(e) =>
                          (e.currentTarget.style.background = "var(--bg-elevated)")
                        }
                      >
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 13, color: "var(--text-primary)" }}>
                            {d.buyer_name || d.id.slice(-8)}
                          </div>
                          <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                            {reasonLabel(d.reason)} · {formatCurrency(d.amount)}
                          </div>
                        </div>
                        <DeadlineBadge due={d.response_due_date} size="sm" />
                      </Link>
                    ))}
                  </div>
                )}
              </div>

              {/* Recent disputes */}
              <div className="card card-lg">
                <div className="section-header">
                  <div className="section-title">Recent Disputes</div>
                  <Link href="/disputes" style={{ fontSize: 12, color: "var(--brand-light)", textDecoration: "none" }}>
                    See all →
                  </Link>
                </div>
                {recentDisputes.length === 0 ? (
                  <div className="empty-state" style={{ padding: "30px 0" }}>
                    <div style={{ fontSize: 28 }}>⚖</div>
                    <div className="empty-title">No disputes yet</div>
                    <div className="empty-description">
                      Use "Simulate Dispute" to create a demo case
                    </div>
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={handleSimulate}
                      style={{ marginTop: 8 }}
                    >
                      ⚡ Simulate
                    </button>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {recentDisputes.map((d) => (
                      <Link
                        key={d.id}
                        href={`/disputes/${d.id}`}
                        style={{
                          display: "grid",
                          gridTemplateColumns: "1fr auto auto",
                          alignItems: "center",
                          gap: 12,
                          padding: "10px 12px",
                          background: "var(--bg-elevated)",
                          borderRadius: "var(--radius-sm)",
                          border: "1px solid var(--border-light)",
                          textDecoration: "none",
                          transition: "border-color 0.15s",
                        }}
                        onMouseEnter={(e) =>
                          (e.currentTarget.style.borderColor = "var(--brand)")
                        }
                        onMouseLeave={(e) =>
                          (e.currentTarget.style.borderColor = "var(--border-light)")
                        }
                      >
                        <div>
                          <div style={{ fontWeight: 500, fontSize: 13, color: "var(--text-primary)" }}>
                            {d.buyer_name || "Unknown buyer"}{" "}
                            {d.is_simulated && (
                              <span className="badge badge-muted" style={{ fontSize: 9, verticalAlign: "middle" }}>SIM</span>
                            )}
                          </div>
                          <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                            {reasonLabel(d.reason)} · {formatDate(d.create_time)}
                          </div>
                        </div>
                        <div style={{ fontWeight: 700, fontSize: 14 }}>
                          {formatCurrency(d.amount)}
                        </div>
                        <StatusBadge status={d.status} />
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Info banner */}
            <div
              style={{
                marginTop: 24,
                padding: "16px 20px",
                background: "var(--bg-card)",
                border: "1px solid var(--border)",
                borderLeft: "4px solid var(--brand)",
                borderRadius: "var(--radius)",
                fontSize: 13,
                color: "var(--text-secondary)",
                display: "flex",
                gap: 12,
                alignItems: "flex-start",
              }}
            >
              <span style={{ fontSize: 20 }}>💡</span>
              <div>
                <div style={{ fontWeight: 600, color: "var(--text-primary)", marginBottom: 4 }}>
                  How DisputeShield works
                </div>
                <div style={{ lineHeight: 1.7 }}>
                  When a dispute arrives, the AI agent classifies it, retrieves relevant PayPal policy passages,
                  scores the evidence, and computes the expected value of fighting vs. accepting.
                  <strong style={{ color: "var(--brand-light)" }}> You always approve before any PayPal action is taken.</strong>
                  {" "}Every decision is audited and explained.
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}
