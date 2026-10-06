// Utility formatting helpers

export function formatCurrency(amount: number, currency = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatDeadline(iso: string | null | undefined): {
  label: string;
  urgency: "critical" | "warning" | "ok" | "none";
  hours: number;
} {
  if (!iso) return { label: "No deadline", urgency: "none", hours: Infinity };
  const diff = new Date(iso).getTime() - Date.now();
  const hours = diff / 3600000;
  if (hours < 0) return { label: "Overdue", urgency: "critical", hours };
  if (hours < 24) return { label: `${Math.round(hours)}h left`, urgency: "critical", hours };
  if (hours < 72) return { label: `${Math.round(hours / 24)}d left`, urgency: "warning", hours };
  const days = Math.round(hours / 24);
  return { label: `${days}d left`, urgency: "ok", hours };
}

export function reasonLabel(reason: string): string {
  const map: Record<string, string> = {
    ITEM_NOT_RECEIVED: "Item Not Received",
    NOT_AS_DESCRIBED: "Not As Described",
    UNAUTHORIZED: "Unauthorized",
    DUPLICATE: "Duplicate",
    OTHER: "Other",
  };
  return map[reason] || reason;
}

export function statusLabel(status: string): string {
  const map: Record<string, string> = {
    RECEIVED: "Received",
    ANALYSING: "Analysing",
    READY: "Ready for Review",
    APPROVED: "Approved",
    SUBMITTED: "Submitted",
    RESOLVED: "Resolved",
  };
  return map[status] || status;
}

export function truncate(text: string | null | undefined, max = 120): string {
  if (!text) return "";
  return text.length > max ? text.slice(0, max) + "…" : text;
}
