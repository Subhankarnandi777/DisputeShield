"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

interface Props {
  className?: string;
}

export default function ModeBadge({ className = "" }: Props) {
  const [simulationMode, setSimulationMode] = useState<boolean | null>(null);

  useEffect(() => {
    api.health()
      .then((h) => setSimulationMode(h.simulation_mode))
      .catch(() => setSimulationMode(true));
  }, []);

  const isSandbox = simulationMode === false;

  return (
    <div
      className={`mode-badge ${isSandbox ? "sandbox" : "simulation"} ${className}`}
      title={
        isSandbox
          ? "Connected to PayPal Sandbox"
          : "Running in Simulation Mode — safely mock disputes"
      }
    >
      <span className="dot" />
      <span>
        {simulationMode === null
          ? "Checking..."
          : isSandbox
          ? "Sandbox Live"
          : "Simulation"}
      </span>
    </div>
  );
}
