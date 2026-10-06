// Shared TypeScript types mirroring backend schemas

export type DisputeStatus =
  | "RECEIVED"
  | "ANALYSING"
  | "READY"
  | "APPROVED"
  | "SUBMITTED"
  | "RESOLVED";

export type DisputeReason =
  | "ITEM_NOT_RECEIVED"
  | "NOT_AS_DESCRIBED"
  | "UNAUTHORIZED"
  | "DUPLICATE"
  | "OTHER";

export type Recommendation = "fight" | "accept";

export type AnalysisStatus = "pending" | "running" | "done" | "error";

export interface CitedPassage {
  source: string;
  text: string;
}

export interface EvidenceScoreBreakdown {
  [key: string]: number;
}

export interface Dispute {
  id: string;
  paypal_dispute_id: string;
  status: DisputeStatus;
  reason: DisputeReason;
  amount: number;
  currency: string;
  buyer_name: string;
  buyer_email: string;
  create_time: string;
  update_time: string;
  response_due_date: string | null;
  is_simulated: boolean;
  analysis_status: AnalysisStatus;
  classification: string | null;
  classification_confidence: number | null;
  classification_rationale: string | null;
  evidence_score: number | null;
  evidence_score_breakdown: EvidenceScoreBreakdown;
  p_win: number | null;
  ev_fight: number | null;
  fight_threshold: number | null;
  recommendation: Recommendation | null;
  decision_explanation: string | null;
  evidence_narrative: string | null;
  buyer_message_draft: string | null;
  missing_evidence: string[];
  cited_passages: CitedPassage[];
  tone: string;
  prompt_version: string;
  action_taken: string | null;
  action_timestamp: string | null;
  action_approved_by: string | null;
  outcome: "WON" | "LOST" | "STALEMATE" | null;
  seller_message_to_buyer: string;
}

export interface AuditEntry {
  id: number;
  timestamp: string;
  actor: "system" | "merchant" | "agent";
  action: string;
  detail: string;
}

export interface DashboardStats {
  total_disputes: number;
  open_disputes: number;
  resolved_disputes: number;
  win_rate: number;
  money_at_risk: number;
  money_recovered: number;
  money_lost: number;
  avg_response_hours: number;
  urgent_disputes: number;
  fight_recommended: number;
  accept_recommended: number;
  pending_analysis: number;
}

export interface MerchantSettings {
  dispute_fee: number;
  effort_cost: number;
  base_rate_item_not_received: number;
  base_rate_not_as_described: number;
  base_rate_unauthorized: number;
  base_rate_duplicate: number;
  base_rate_other: number;
}

export interface WhatIfResult {
  recommendation: Recommendation;
  p_win: number;
  ev_fight: number;
  threshold: number;
  explanation: string;
  inputs: {
    amount: number;
    fee: number;
    effort_cost: number;
    p_win: number;
  };
}
