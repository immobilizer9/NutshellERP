"use client";

import { useEffect, useState } from "react";

const STAGE_LABELS: Record<string, string> = {
  LEAD:          "Lead",
  CONTACTED:     "Contacted",
  VISITED:       "Visited",
  PROPOSAL_SENT: "Proposal",
  NEGOTIATION:   "Negotiation",
  CLOSED_WON:    "Won",
  CLOSED_LOST:   "Lost",
};

interface VisitAlert {
  id:            string;
  name:          string;
  city:          string;
  pipelineStage: string;
  assignedTo:    { id: string; name: string } | null;
  lastVisit:     string | null;
  daysAgo:       number | null;
  neverVisited:  boolean;
}

export default function VisitAlerts({ thresholdDays = 30 }: { thresholdDays?: number }) {
  const [alerts, setAlerts] = useState<VisitAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    fetch(`/api/visit-alerts?days=${thresholdDays}`, { credentials: "include" })
      .then((r) => r.json())
      .then((d) => {
        setAlerts(Array.isArray(d) ? d : []);
        setLoading(false);
      });
  }, [thresholdDays]);

  if (loading) return null;
  if (alerts.length === 0) return null;

  const shown = expanded ? alerts : alerts.slice(0, 5);

  return (
    <div className="card" style={{ marginBottom: 16, border: "1px solid var(--yellow, #f59e0b)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <div>
          <h2 style={{ margin: 0, color: "var(--yellow, #f59e0b)" }}>
            ⚠ Visit Alerts ({alerts.length})
          </h2>
          <p style={{ margin: "3px 0 0", fontSize: 12, color: "var(--text-muted)" }}>
            Schools not visited in {thresholdDays}+ days
          </p>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {shown.map((alert) => (
          <div key={alert.id} style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            background: "var(--bg)", borderRadius: "var(--radius)",
            border: `1px solid ${alert.neverVisited ? "var(--red-border, #fca5a5)" : "var(--border)"}`,
            padding: "8px 12px",
          }}>
            <div>
              <a href={`/bd/schools?id=${alert.id}`}
                style={{ fontWeight: 600, fontSize: 13, color: "var(--text-primary)", textDecoration: "none" }}>
                {alert.name}
              </a>
              <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 1 }}>
                {alert.city} · {STAGE_LABELS[alert.pipelineStage] ?? alert.pipelineStage}
                {alert.assignedTo && ` · ${alert.assignedTo.name}`}
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              {alert.neverVisited ? (
                <span style={{ fontSize: 12, fontWeight: 600, color: "var(--red, #dc2626)" }}>Never visited</span>
              ) : (
                <span style={{ fontSize: 12, fontWeight: 600, color: alert.daysAgo! > 60 ? "var(--red, #dc2626)" : "var(--yellow, #f59e0b)" }}>
                  {alert.daysAgo}d ago
                </span>
              )}
              {alert.lastVisit && (
                <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                  {new Date(alert.lastVisit).toLocaleDateString()}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {alerts.length > 5 && (
        <button className="btn btn-ghost" style={{ marginTop: 10, fontSize: 12, width: "100%" }}
          onClick={() => setExpanded((e) => !e)}>
          {expanded ? "Show less" : `Show all ${alerts.length} alerts`}
        </button>
      )}
    </div>
  );
}
