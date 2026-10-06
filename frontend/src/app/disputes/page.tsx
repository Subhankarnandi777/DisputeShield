"use client";

import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";
import type { Dispute } from "@/lib/types";
import DisputeTable from "@/components/DisputeTable";

export default function DisputesPage() {
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [simulating, setSimulating] = useState(false);

  const load = useCallback(async () => {
    try {
      setError(null);
      const data = await api.listDisputes();
      setDisputes(data);
    } catch (e: any) {
      setError(e.message || "Failed to load disputes");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleSimulate = async () => {
    setSimulating(true);
    try {
      await api.simulateDispute();
      await load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSimulating(false);
    }
  };

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">⚖ Disputes</h1>
          <div className="page-subtitle">
            {disputes.length} total · {disputes.filter((d) => d.status !== "RESOLVED").length} open
          </div>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button
            className="btn btn-ghost btn-sm"
            onClick={load}
            title="Refresh"
          >
            ↻ Refresh
          </button>
          <button
            className="btn btn-primary"
            onClick={handleSimulate}
            disabled={simulating}
            id="simulate-dispute-btn"
          >
            {simulating ? (
              <>
                <span className="spinner" style={{ width: 14, height: 14 }} />
                Creating…
              </>
            ) : (
              "⚡ Simulate Dispute"
            )}
          </button>
        </div>
      </div>

      <div className="page-body">
        {error && (
          <div className="error-state" style={{ marginBottom: 20 }}>
            ⚠ {error}
          </div>
        )}

        {loading ? (
          <div className="loading-state">
            <div className="spinner" style={{ width: 32, height: 32 }} />
            <div>Loading disputes…</div>
          </div>
        ) : (
          <DisputeTable disputes={disputes} />
        )}
      </div>
    </>
  );
}
