"use client";
import type { AuditEntry } from "@/lib/types";
import { formatDateTime } from "@/lib/format";

interface AuditTimelineProps {
  entries: AuditEntry[];
}

const ACTOR_LABELS: Record<string, string> = {
  system: "System",
  agent: "AI Agent",
  merchant: "Merchant",
};

const ACTION_LABELS: Record<string, string> = {
  dispute_received: "Dispute Received",
  analysis_started: "Analysis Started",
  analysis_complete: "Analysis Complete",
  draft_edited: "Draft Edited",
  action_approved: "Action Approved",
  recommendation_rejected: "Recommendation Rejected",
  dispute_resolved: "Dispute Resolved",
};

export default function AuditTimeline({ entries }: AuditTimelineProps) {
  if (!entries.length) {
    return (
      <div className="empty-state">
        <div className="empty-icon">📋</div>
        <div className="empty-title">No audit entries yet</div>
      </div>
    );
  }

  return (
    <div className="timeline">
      {entries.map((entry, i) => (
        <div key={entry.id ?? i} className="timeline-item">
          <div className={`timeline-dot ${entry.actor}`} />
          <div className="timeline-time">{formatDateTime(entry.timestamp)}</div>
          <div className="timeline-action">
            <span
              style={{
                fontSize: 11,
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.3px",
                color:
                  entry.actor === "agent"
                    ? "var(--brand-light)"
                    : entry.actor === "merchant"
                    ? "var(--success)"
                    : "var(--text-muted)",
                marginRight: 6,
              }}
            >
              {ACTOR_LABELS[entry.actor] ?? entry.actor}
            </span>
            {ACTION_LABELS[entry.action] ?? entry.action.replace(/_/g, " ")}
          </div>
          {entry.detail && (
            <div className="timeline-detail">{entry.detail}</div>
          )}
        </div>
      ))}
    </div>
  );
}
