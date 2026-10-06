"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import type { MerchantSettings } from "@/lib/types";

const RATE_KEYS: [keyof MerchantSettings, string][] = [
  ["base_rate_item_not_received", "Item Not Received"],
  ["base_rate_not_as_described", "Not As Described"],
  ["base_rate_unauthorized", "Unauthorized"],
  ["base_rate_duplicate", "Duplicate"],
  ["base_rate_other", "Other"],
];

export default function SettingsPage() {
  const [settings, setSettings] = useState<MerchantSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Local form state
  const [fee, setFee] = useState(20);
  const [effort, setEffort] = useState(5);
  const [rates, setRates] = useState<Record<string, number>>({});

  useEffect(() => {
    api.getSettings()
      .then((s) => {
        setSettings(s);
        setFee(s.dispute_fee);
        setEffort(s.effort_cost);
        const r: Record<string, number> = {};
        RATE_KEYS.forEach(([key]) => { r[key as string] = s[key] as number; });
        setRates(r);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      const updated = await api.updateSettings({
        dispute_fee: fee,
        effort_cost: effort,
        ...Object.fromEntries(
          Object.entries(rates).map(([k, v]) => [k, v])
        ),
      });
      setSettings(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (!settings) return;
    setFee(settings.dispute_fee);
    setEffort(settings.effort_cost);
    const r: Record<string, number> = {};
    RATE_KEYS.forEach(([key]) => { r[key as string] = settings[key] as number; });
    setRates(r);
  };

  if (loading) {
    return (
      <div className="loading-state" style={{ marginTop: 80 }}>
        <div className="spinner" style={{ width: 32, height: 32 }} />
        <div>Loading settings…</div>
      </div>
    );
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">⚙ Settings</h1>
          <div className="page-subtitle">
            Configure merchant assumptions used by the decision engine
          </div>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button className="btn btn-ghost" onClick={handleReset} disabled={saving}>
            ↺ Reset
          </button>
          <button
            className="btn btn-primary"
            onClick={handleSave}
            disabled={saving}
            id="save-settings-btn"
          >
            {saving ? (
              <>
                <span className="spinner" style={{ width: 14, height: 14 }} />
                Saving…
              </>
            ) : (
              "✓ Save Settings"
            )}
          </button>
        </div>
      </div>

      <div className="page-body">
        {error && (
          <div className="error-state" style={{ marginBottom: 16 }}>⚠ {error}</div>
        )}
        {saved && (
          <div className="alert alert-success" style={{ marginBottom: 16 }}>
            ✓ Settings saved successfully
          </div>
        )}

        <div
          className="alert alert-warning"
          style={{ marginBottom: 24 }}
        >
          <span>⚠</span>
          <div>
            All values on this page are <strong>merchant assumptions</strong>, not official PayPal statistics.
            They reflect your business context and are used to calculate the expected value of fighting a dispute.
          </div>
        </div>

        <div className="grid-2" style={{ gap: 24 }}>
          {/* Cost assumptions */}
          <div className="card card-lg">
            <div className="section-title" style={{ marginBottom: 20 }}>Cost Assumptions</div>

            <div className="form-group">
              <label>
                PayPal Dispute Fee ($)
                <span className="helper-text" style={{ marginLeft: 8 }}>
                  assumption — check your PayPal account for actual fees
                </span>
              </label>
              <input
                type="number"
                value={fee}
                onChange={(e) => setFee(parseFloat(e.target.value))}
                min={0}
                step={0.5}
              />
              <div className="helper-text">
                Amount PayPal charges when you lose a dispute. Default: $20.00 (illustrative).
              </div>
            </div>

            <div className="form-group">
              <label>
                Effort Cost ($/dispute)
                <span className="helper-text" style={{ marginLeft: 8 }}>
                  assumption
                </span>
              </label>
              <input
                type="number"
                value={effort}
                onChange={(e) => setEffort(parseFloat(e.target.value))}
                min={0}
                step={0.5}
              />
              <div className="helper-text">
                Your estimated cost to respond to and manage one dispute (time, opportunity cost).
              </div>
            </div>

            {/* Decision formula display */}
            <div
              style={{
                marginTop: 20,
                padding: "14px 16px",
                background: "var(--bg-elevated)",
                borderRadius: "var(--radius-sm)",
                border: "1px solid var(--border)",
                fontFamily: "monospace",
                fontSize: 13,
                color: "var(--text-secondary)",
                lineHeight: 1.8,
              }}
            >
              <div style={{ color: "var(--text-muted)", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 6 }}>
                Decision Formula
              </div>
              <div>EV_fight = p × A − (1−p) × F − E</div>
              <div>Fight when EV_fight &gt; 0</div>
              <div style={{ marginTop: 6, color: "var(--brand-light)" }}>
                where F = ${fee.toFixed(2)}, E = ${effort.toFixed(2)}
              </div>
            </div>
          </div>

          {/* Base win rates */}
          <div className="card card-lg">
            <div className="section-title" style={{ marginBottom: 4 }}>Base Win Rate Assumptions</div>
            <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 20 }}>
              Illustrative base rates used when evidence is perfect. Tune to your category mix and history.
              These are <strong>not</strong> official PayPal win rates.
            </p>

            {RATE_KEYS.map(([key, label]) => {
              const val = rates[key as string] ?? 0;
              const pct = Math.round(val * 100);
              const color = pct >= 50 ? "var(--success)" : pct >= 30 ? "var(--warning)" : "var(--danger)";
              return (
                <div key={key as string} style={{ marginBottom: 20 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                    <label style={{ margin: 0, textTransform: "none", fontSize: 13, fontWeight: 500, color: "var(--text-secondary)" }}>
                      {label}
                    </label>
                    <span style={{ fontSize: 14, fontWeight: 700, color }}>{pct}%</span>
                  </div>
                  <input
                    type="range"
                    min={2}
                    max={95}
                    value={pct}
                    onChange={(e) =>
                      setRates((r) => ({ ...r, [key as string]: parseInt(e.target.value) / 100 }))
                    }
                    style={{ accentColor: color }}
                  />
                </div>
              );
            })}
          </div>
        </div>

        {/* How the engine works */}
        <div className="card" style={{ marginTop: 24 }}>
          <div className="section-title" style={{ marginBottom: 12 }}>How the Decision Engine Works</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 20, fontSize: 13, color: "var(--text-secondary)" }}>
            {[
              {
                step: "1",
                title: "Classify",
                desc: "The AI classifies the dispute into a category (e.g. item_not_received) with a confidence score.",
              },
              {
                step: "2",
                title: "Score Evidence",
                desc: "A rubric evaluates the available evidence against what's needed to win that category.",
              },
              {
                step: "3",
                title: "Estimate Win Prob",
                desc: "p_win = base_rate × (0.5 + 0.5 × evidence_score) + adjustments, clamped to [2%, 95%].",
              },
              {
                step: "4",
                title: "Compute EV",
                desc: "EV = p × Amount − (1−p) × Fee − Effort. If EV > 0, fight is recommended.",
              },
              {
                step: "5",
                title: "Draft Evidence",
                desc: "The AI drafts a narrative and buyer message grounded only in confirmed facts.",
              },
              {
                step: "6",
                title: "Merchant Approves",
                desc: "You review and approve. Every action is audited. Nothing executes without your confirmation.",
              },
            ].map((s) => (
              <div key={s.step} style={{ padding: "14px", background: "var(--bg-elevated)", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)" }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "var(--brand-light)", marginBottom: 4 }}>
                  STEP {s.step}
                </div>
                <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)", marginBottom: 4 }}>
                  {s.title}
                </div>
                <div>{s.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
