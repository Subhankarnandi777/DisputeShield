"use client";

import Link from "next/link";
import { useState, useMemo } from "react";
import type { Dispute } from "@/lib/types";
import { formatCurrency, formatDate, reasonLabel } from "@/lib/format";
import DeadlineBadge from "./DeadlineBadge";
import StatusBadge from "./StatusBadge";
import { AgGridReact } from "ag-grid-react";
import type { ColDef } from "ag-grid-community";

import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-quartz.css";

interface Props {
  disputes: Dispute[];
}

type SortKey = "create_time" | "amount" | "status" | "response_due_date";

export default function DisputeTable({ disputes }: Props) {
  const [viewMode, setViewMode] = useState<"ag-grid" | "classic">("ag-grid");
  const [filter, setFilter] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("create_time");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  // Filtered & sorted for classic table view
  const filtered = useMemo(() => {
    return disputes.filter((d) => {
      if (!filter) return true;
      const q = filter.toLowerCase();
      return (
        d.id.toLowerCase().includes(q) ||
        d.buyer_name.toLowerCase().includes(q) ||
        d.reason.toLowerCase().includes(q) ||
        d.status.toLowerCase().includes(q)
      );
    });
  }, [disputes, filter]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let av: string | number = a[sortKey] ?? "";
      let bv: string | number = b[sortKey] ?? "";
      if (typeof av === "string") av = av.toLowerCase();
      if (typeof bv === "string") bv = bv.toLowerCase();
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
  }, [filtered, sortKey, sortDir]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  const SortIcon = ({ colKey }: { colKey: SortKey }) =>
    sortKey === colKey ? (
      <span style={{ fontSize: 9, marginLeft: 3 }}>{sortDir === "asc" ? "▲" : "▼"}</span>
    ) : (
      <span style={{ fontSize: 9, marginLeft: 3, opacity: 0.3 }}>⇅</span>
    );

  // AG Grid column definitions
  const columnDefs: ColDef<Dispute>[] = useMemo(
    () => [
      {
        field: "id",
        headerName: "Dispute ID",
        width: 170,
        cellRenderer: (params: any) => {
          const d: Dispute = params.data;
          if (!d) return null;
          return (
            <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", height: "100%" }}>
              <span style={{ fontFamily: "monospace", fontSize: 12, color: "var(--text-muted)" }}>
                {d.id.slice(-12)}
              </span>
              <div style={{ fontSize: 11, color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 4 }}>
                <span>{formatDate(d.create_time)}</span>
                {d.is_simulated && (
                  <span className="badge badge-muted" style={{ padding: "0 4px", fontSize: 9 }}>SIM</span>
                )}
              </div>
            </div>
          );
        },
      },
      {
        field: "buyer_name",
        headerName: "Buyer",
        flex: 1,
        minWidth: 160,
        cellRenderer: (params: any) => {
          const d: Dispute = params.data;
          if (!d) return null;
          return (
            <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", height: "100%" }}>
              <span style={{ fontWeight: 500, color: "var(--text-primary)" }}>{d.buyer_name || "—"}</span>
              <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{d.buyer_email || ""}</span>
            </div>
          );
        },
      },
      {
        field: "reason",
        headerName: "Reason",
        width: 200,
        cellRenderer: (params: any) => {
          const val = params.value;
          return <span className="tag">{reasonLabel(val)}</span>;
        },
      },
      {
        field: "amount",
        headerName: "Amount",
        width: 120,
        sortable: true,
        cellRenderer: (params: any) => {
          const d: Dispute = params.data;
          if (!d) return null;
          return (
            <span style={{ fontWeight: 700, color: "var(--text-primary)" }}>
              {formatCurrency(d.amount, d.currency)}
            </span>
          );
        },
      },
      {
        field: "status",
        headerName: "Status",
        width: 150,
        sortable: true,
        cellRenderer: (params: any) => {
          return <StatusBadge status={params.value} />;
        },
      },
      {
        field: "recommendation",
        headerName: "AI Recommendation",
        width: 160,
        cellRenderer: (params: any) => {
          const d: Dispute = params.data;
          if (!d) return null;
          if (d.recommendation === "fight") {
            return <span className="badge badge-brand">⚔ Fight</span>;
          }
          if (d.recommendation === "accept") {
            return <span className="badge badge-warning">✋ Accept</span>;
          }
          if (d.analysis_status === "pending" || d.analysis_status === "running") {
            return (
              <span className="badge badge-muted">
                <span className="spinner" style={{ width: 10, height: 10, borderWidth: 1.5, marginRight: 4 }} />
                Analysing
              </span>
            );
          }
          return <span className="badge badge-muted">—</span>;
        },
      },
      {
        field: "response_due_date",
        headerName: "Deadline",
        width: 140,
        sortable: true,
        cellRenderer: (params: any) => {
          return <DeadlineBadge due={params.value} size="sm" />;
        },
      },
      {
        headerName: "Action",
        width: 100,
        pinned: "right",
        cellRenderer: (params: any) => {
          const d: Dispute = params.data;
          if (!d) return null;
          return (
            <Link href={`/disputes/${d.id}`} className="btn btn-ghost btn-sm" style={{ textDecoration: "none" }}>
              View →
            </Link>
          );
        },
      },
    ],
    []
  );

  if (!disputes.length) {
    return (
      <div className="empty-state">
        <div className="empty-icon">⚖</div>
        <div className="empty-title">No disputes yet</div>
        <div className="empty-description">
          Use the &ldquo;Simulate Dispute&rdquo; button in the sidebar to create a realistic demo case,
          or connect your PayPal sandbox account to receive real disputes via webhook.
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Controls & Sponsor Badge */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16,
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1 }}>
          <input
            type="text"
            placeholder="Search by ID, buyer, reason, or status…"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            style={{ maxWidth: 360 }}
          />
          <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
            Showing {filtered.length} of {disputes.length} disputes
          </div>
        </div>

        {/* View Mode Switcher */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div
            style={{
              display: "flex",
              background: "var(--bg-surface)",
              padding: 3,
              borderRadius: "var(--radius-sm)",
              border: "1px solid var(--border-color)",
            }}
          >
            <button
              onClick={() => setViewMode("ag-grid")}
              className={`btn btn-sm ${viewMode === "ag-grid" ? "btn-primary" : "btn-ghost"}`}
              style={{ padding: "4px 10px", fontSize: 12 }}
              title="Powered by AG Grid (Hackathon Sponsor)"
            >
              ⚡ AG Grid
            </button>
            <button
              onClick={() => setViewMode("classic")}
              className={`btn btn-sm ${viewMode === "classic" ? "btn-primary" : "btn-ghost"}`}
              style={{ padding: "4px 10px", fontSize: 12 }}
            >
              Classic Table
            </button>
          </div>
        </div>
      </div>

      {viewMode === "ag-grid" ? (
        <div
          className="ag-theme-quartz-dark"
          style={{
            height: 480,
            width: "100%",
            borderRadius: "var(--radius-md)",
            overflow: "hidden",
            border: "1px solid var(--border-color)",
            boxShadow: "var(--shadow-sm)",
          }}
        >
          <AgGridReact
            rowData={filtered}
            columnDefs={columnDefs}
            rowHeight={52}
            headerHeight={44}
            pagination={true}
            paginationPageSize={10}
            paginationPageSizeSelector={[10, 20, 50]}
            animateRows={true}
            defaultColDef={{
              resizable: true,
              sortable: true,
              filter: true,
            }}
          />
        </div>
      ) : (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th onClick={() => handleSort("create_time")} style={{ width: 160, cursor: "pointer" }}>
                  Dispute ID <SortIcon colKey="create_time" />
                </th>
                <th>Buyer</th>
                <th>Reason</th>
                <th onClick={() => handleSort("amount")} style={{ width: 100, cursor: "pointer" }}>
                  Amount <SortIcon colKey="amount" />
                </th>
                <th onClick={() => handleSort("status")} style={{ width: 140, cursor: "pointer" }}>
                  Status <SortIcon colKey="status" />
                </th>
                <th>AI Rec.</th>
                <th onClick={() => handleSort("response_due_date")} style={{ width: 130, cursor: "pointer" }}>
                  Deadline <SortIcon colKey="response_due_date" />
                </th>
                <th style={{ width: 80 }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((d) => (
                <tr key={d.id}>
                  <td>
                    <div style={{ fontFamily: "monospace", fontSize: 12, color: "var(--text-muted)" }}>
                      {d.id.slice(-12)}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 1 }}>
                      {formatDate(d.create_time)}
                      {d.is_simulated && (
                        <span className="badge badge-muted" style={{ marginLeft: 6, fontSize: 9 }}>
                          SIM
                        </span>
                      )}
                    </div>
                  </td>
                  <td>
                    <div style={{ fontWeight: 500 }}>{d.buyer_name || "—"}</div>
                    <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{d.buyer_email || ""}</div>
                  </td>
                  <td>
                    <span className="tag">{reasonLabel(d.reason)}</span>
                  </td>
                  <td>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>
                      {formatCurrency(d.amount, d.currency)}
                    </div>
                  </td>
                  <td>
                    <StatusBadge status={d.status} />
                  </td>
                  <td>
                    {d.recommendation ? (
                      <span
                        className={`badge ${d.recommendation === "fight" ? "badge-brand" : "badge-warning"}`}
                      >
                        {d.recommendation === "fight" ? "⚔ Fight" : "✋ Accept"}
                      </span>
                    ) : d.analysis_status === "pending" || d.analysis_status === "running" ? (
                      <span className="badge badge-muted">
                        <span className="spinner" style={{ width: 10, height: 10, borderWidth: 1.5 }} />
                        Analysing
                      </span>
                    ) : (
                      <span className="badge badge-muted">—</span>
                    )}
                  </td>
                  <td>
                    <DeadlineBadge due={d.response_due_date} size="sm" />
                  </td>
                  <td>
                    <Link href={`/disputes/${d.id}`} className="btn btn-ghost btn-sm">
                      View →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
