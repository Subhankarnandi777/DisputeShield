"use client";
import type { DashboardStats } from "@/lib/types";
import { formatCurrency } from "@/lib/format";

interface Props {
  stats: DashboardStats;
}

export default function StatsCards({ stats }: Props) {
  const cards = [
    {
      label: "Open Disputes",
      value: stats.open_disputes,
      sub: `${stats.total_disputes} total`,
      className: stats.open_disputes > 0 ? "warning" : "",
    },
    {
      label: "Win Rate",
      value: `${stats.win_rate.toFixed(1)}%`,
      sub: `${stats.resolved_disputes} resolved`,
      className: stats.win_rate >= 60 ? "success" : stats.win_rate >= 40 ? "" : "danger",
    },
    {
      label: "Money at Risk",
      value: formatCurrency(stats.money_at_risk),
      sub: "open disputes",
      className: stats.money_at_risk > 0 ? "danger" : "",
    },
    {
      label: "Recovered",
      value: formatCurrency(stats.money_recovered),
      sub: "disputes won",
      className: "success",
    },
    {
      label: "Urgent",
      value: stats.urgent_disputes,
      sub: "deadlines < 3 days",
      className: stats.urgent_disputes > 0 ? "danger" : "",
    },
    {
      label: "AI Recommends Fight",
      value: stats.fight_recommended,
      sub: `accept: ${stats.accept_recommended}`,
      className: "brand",
    },
    {
      label: "Avg Response",
      value: stats.avg_response_hours > 0 ? `${stats.avg_response_hours.toFixed(0)}h` : "—",
      sub: "time to action",
      className: "",
    },
    {
      label: "Pending Analysis",
      value: stats.pending_analysis,
      sub: "awaiting AI",
      className: stats.pending_analysis > 0 ? "warning" : "",
    },
  ];

  return (
    <div className="stat-grid">
      {cards.map((c) => (
        <div key={c.label} className="stat-card">
          <div className="stat-label">{c.label}</div>
          <div className={`stat-value ${c.className}`}>{c.value}</div>
          <div className="stat-sub">{c.sub}</div>
        </div>
      ))}
    </div>
  );
}
