"use client";
import { statusLabel } from "@/lib/format";
import type { DisputeStatus } from "@/lib/types";

interface Props {
  status: DisputeStatus;
}

const classMap: Record<DisputeStatus, string> = {
  RECEIVED: "badge-info",
  ANALYSING: "badge-brand",
  READY: "badge-success",
  APPROVED: "badge-success",
  SUBMITTED: "badge-warning",
  RESOLVED: "badge-muted",
};

const iconMap: Record<DisputeStatus, string> = {
  RECEIVED: "📥",
  ANALYSING: "🤖",
  READY: "✅",
  APPROVED: "👍",
  SUBMITTED: "📤",
  RESOLVED: "✓",
};

export default function StatusBadge({ status }: Props) {
  return (
    <span className={`badge ${classMap[status] ?? "badge-muted"}`}>
      {iconMap[status]} {statusLabel(status)}
    </span>
  );
}
