"use client";
import { formatDeadline } from "@/lib/format";

interface DeadlineBadgeProps {
  due: string | null | undefined;
  size?: "sm" | "md";
}

export default function DeadlineBadge({ due, size = "md" }: DeadlineBadgeProps) {
  const { label, urgency } = formatDeadline(due);

  const classMap = {
    critical: "badge-danger",
    warning: "badge-warning",
    ok: "badge-success",
    none: "badge-muted",
  };

  const icon = urgency === "critical" ? "🔴" : urgency === "warning" ? "🟡" : urgency === "ok" ? "🟢" : "—";

  return (
    <span
      className={`badge ${classMap[urgency]}`}
      style={size === "sm" ? { fontSize: 10, padding: "2px 6px" } : {}}
      title={due ? `Due: ${new Date(due).toLocaleString()}` : "No deadline set"}
    >
      {icon} {label}
    </span>
  );
}
