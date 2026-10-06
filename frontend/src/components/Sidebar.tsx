"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { api } from "@/lib/api";

const NAV = [
  { href: "/", icon: "⊞", label: "Dashboard" },
  { href: "/disputes", icon: "⚖", label: "Disputes" },
  { href: "/demo-store", icon: "🛒", label: "Demo Store" },
  { href: "/settings", icon: "⚙", label: "Settings" },
];

export default function Sidebar() {
  const path = usePathname();
  const [simulationMode, setSimulationMode] = useState<boolean | null>(null);
  const [simulating, setSimulating] = useState(false);

  useEffect(() => {
    api.health().then((h) => setSimulationMode(h.simulation_mode)).catch(() => setSimulationMode(true));
  }, []);

  const handleSimulate = async () => {
    setSimulating(true);
    try {
      const result = await api.simulateDispute();
      // Navigate to disputes to see the new one
      window.location.href = "/disputes";
    } catch (e) {
      console.error("Simulate failed", e);
    } finally {
      setSimulating(false);
    }
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="logo-mark">
          <div className="logo-icon">🛡</div>
          <div>
            <div className="logo-text">DisputeShield</div>
            <div className="logo-sub">AI Dispute Agent</div>
          </div>
        </div>
      </div>

      <nav className="sidebar-nav">
        <div className="nav-label">Navigation</div>
        {NAV.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`nav-item ${path === item.href ? "active" : ""}`}
          >
            <span className="icon">{item.icon}</span>
            <span>{item.label}</span>
          </Link>
        ))}

        <div className="nav-label" style={{ marginTop: 12 }}>Quick Actions</div>
        <button
          className="nav-item"
          onClick={handleSimulate}
          disabled={simulating}
          title="Create a realistic simulated dispute for demo"
        >
          <span className="icon">{simulating ? "⏳" : "⚡"}</span>
          <span>{simulating ? "Creating..." : "Simulate Dispute"}</span>
        </button>
      </nav>

      <div className="sidebar-footer">
        <div
          className={`mode-badge ${simulationMode === false ? "sandbox" : "simulation"}`}
          title={
            simulationMode === false
              ? "Connected to PayPal Sandbox"
              : "Running in Simulation Mode — no real PayPal calls"
          }
        >
          <span className="dot" />
          <span>
            {simulationMode === null
              ? "Checking..."
              : simulationMode
              ? "Simulation"
              : "Sandbox Live"}
          </span>
        </div>
      </div>
    </aside>
  );
}
