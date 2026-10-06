// Typed API client for the DisputeShield FastAPI backend

import type {
  AuditEntry,
  Dispute,
  DashboardStats,
  MerchantSettings,
  WhatIfResult,
} from "./types";

const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

async function req<T>(
  method: string,
  path: string,
  body?: unknown
): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: body ? { "Content-Type": "application/json" } : {},
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  // --- Stats ---
  getStats: () => req<DashboardStats>("GET", "/stats"),

  // --- Disputes ---
  listDisputes: () => req<Dispute[]>("GET", "/disputes"),
  getDispute: (id: string) => req<Dispute>("GET", `/disputes/${id}`),
  getAuditLog: (id: string) => req<AuditEntry[]>("GET", `/disputes/${id}/audit`),
  patchDraft: (
    id: string,
    body: { evidence_narrative?: string; buyer_message_draft?: string; tone?: string }
  ) => req<Dispute>("PATCH", `/disputes/${id}/draft`, body),
  approveAction: (
    id: string,
    action: "fight" | "accept" | "offer",
    offer_amount?: number
  ) => req<Dispute>("POST", `/disputes/${id}/approve`, { action, offer_amount }),
  rejectAction: (id: string) => req<Dispute>("POST", `/disputes/${id}/reject`),
  whatIf: (
    id: string,
    body: {
      fee?: number;
      effort_cost?: number;
      p_win_override?: number;
      offer_amount?: number;
    }
  ) => req<WhatIfResult>("POST", `/disputes/${id}/whatif`, body),

  // --- Settings ---
  getSettings: () => req<MerchantSettings>("GET", "/settings"),
  updateSettings: (body: Partial<MerchantSettings>) =>
    req<MerchantSettings>("PATCH", "/settings", body),

  // --- Simulate ---
  simulateDispute: () =>
    req<{ dispute_id: string; message: string }>("POST", "/simulate"),

  // --- Health ---
  health: () => req<{ status: string; simulation_mode: boolean }>("GET", "/health"),

  // --- Orders ---
  createOrder: (amount: string, currency = "USD") =>
    req<{ order_id: string }>("POST", "/orders", { amount, currency }),
  captureOrder: (orderId: string) =>
    req<{ status: string; capture_id: string | null }>(
      "POST",
      `/orders/${orderId}/capture`
    ),
};
