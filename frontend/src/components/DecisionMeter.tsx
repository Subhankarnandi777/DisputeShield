"use client";

interface DecisionMeterProps {
  pWin: number;        // 0–1
  threshold: number;   // 0–1
  recommendation: "fight" | "accept" | null;
  size?: "sm" | "md" | "lg";
}

export default function DecisionMeter({ pWin, threshold, recommendation, size = "md" }: DecisionMeterProps) {
  const circumference = 2 * Math.PI * 52;
  const pct = Math.min(Math.max(pWin, 0), 1);
  const threshPct = Math.min(Math.max(threshold, 0), 1);

  // Color based on recommendation — PayPal Blue for Fight, PayPal Gold for Accept
  const color =
    recommendation === "fight"
      ? "#009cde"
      : recommendation === "accept"
      ? "#ffc439"
      : "#8ba4c8";

  const dim = size === "sm" ? 80 : size === "lg" ? 160 : 120;
  const sw = size === "sm" ? 6 : size === "lg" ? 12 : 9;
  const r = (dim / 2) - sw;
  const circ = 2 * Math.PI * r;

  return (
    <div className="prob-display">
      <div className="prob-circle" style={{ width: dim, height: dim }}>
        <svg width={dim} height={dim} viewBox={`0 0 ${dim} ${dim}`} style={{ transform: "rotate(-90deg)" }}>
          {/* Track */}
          <circle
            cx={dim / 2}
            cy={dim / 2}
            r={r}
            fill="none"
            stroke="var(--border)"
            strokeWidth={sw}
          />
          {/* Threshold marker */}
          <circle
            cx={dim / 2}
            cy={dim / 2}
            r={r}
            fill="none"
            stroke="rgba(255,196,57,0.6)"
            strokeWidth={2}
            strokeDasharray={`${threshPct * circ} ${circ}`}
            strokeLinecap="round"
          />
          {/* Win probability fill */}
          <circle
            cx={dim / 2}
            cy={dim / 2}
            r={r}
            fill="none"
            stroke={color}
            strokeWidth={sw - 2}
            strokeDasharray={`${pct * circ} ${circ}`}
            strokeLinecap="round"
            style={{ transition: "stroke-dasharray 1.2s cubic-bezier(0.4, 0, 0.2, 1)" }}
          />
        </svg>
        <div className="prob-circle-text">
          <div className="prob-pct" style={{ color, fontSize: size === "sm" ? 16 : size === "lg" ? 32 : 22 }}>
            {Math.round(pWin * 100)}%
          </div>
          <div className="prob-sub" style={{ fontSize: size === "sm" ? 8 : 10 }}>Win Prob</div>
        </div>
      </div>

      {/* Threshold annotation */}
      <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 6, textAlign: "center" }}>
        Break-even: <span style={{ color: "#ffc439", fontWeight: 600 }}>{Math.round(threshold * 100)}%</span>
        {recommendation && (
          <span
            style={{
              display: "block",
              fontWeight: 700,
              fontSize: 12,
              color: color,
              marginTop: 2,
            }}
          >
            → {recommendation === "fight" ? "⚔ FIGHT" : "✋ ACCEPT"}
          </span>
        )}
      </div>
    </div>
  );
}
