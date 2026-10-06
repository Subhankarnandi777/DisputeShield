"use client";

interface Props {
  score: number; // 0–1
  breakdown: Record<string, number>;
}

function scoreColor(v: number): string {
  if (v >= 0.7) return "#0fd882";   // green — good
  if (v >= 0.4) return "#ffc439";   // PayPal Gold — moderate
  return "#ff5252";                  // red — weak
}

function formatKey(key: string): string {
  return key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function EvidenceScorePanel({ score, breakdown }: Props) {
  const color = scoreColor(score);
  const pct = Math.round(score * 100);

  return (
    <div>
      {/* Overall score */}
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 20 }}>
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: "50%",
            background: `conic-gradient(${color} ${pct * 3.6}deg, var(--border) 0deg)`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            position: "relative",
          }}
        >
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: "50%",
              background: "var(--bg-card)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 16,
              fontWeight: 800,
              color,
            }}
          >
            {pct}
          </div>
        </div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>
            Overall Evidence Score
          </div>
          <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 2 }}>
            {pct >= 70
              ? "Strong — sufficient for most dispute types"
              : pct >= 40
              ? "Moderate — some gaps may weaken the case"
              : "Weak — consider accepting the claim"}
          </div>
        </div>
      </div>

      {/* Breakdown bars */}
      {Object.entries(breakdown).length > 0 && (
        <div>
          <div className="section-title" style={{ marginBottom: 12 }}>Score Breakdown</div>
          {Object.entries(breakdown).map(([key, val]) => {
            const barColor = scoreColor(val);
            return (
              <div key={key} className="score-bar">
                <div className="score-bar-label">{formatKey(key)}</div>
                <div className="score-bar-track">
                  <div
                    className="score-bar-fill"
                    style={{ width: `${val * 100}%`, background: barColor }}
                  />
                </div>
                <div className="score-bar-value" style={{ color: barColor }}>
                  {Math.round(val * 100)}%
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
