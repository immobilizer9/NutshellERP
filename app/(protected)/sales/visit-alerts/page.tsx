"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function SalesVisitAlertsPage() {
  const [alerts,  setAlerts]  = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/visit-alerts", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => {
        setAlerts(Array.isArray(d) ? d : d.alerts ?? []);
        setLoading(false);
      });
  }, []);

  const neverVisited  = alerts.filter((a) => a.neverVisited);
  const overdue       = alerts.filter((a) => !a.neverVisited);

  return (
    <>
      <div className="page-header">
        <h1>Visit Alerts</h1>
        <p>Schools that need a follow-up visit</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 14, marginBottom: 20 }}>
        <div className="stat-card">
          <div className="stat-label">Never Visited</div>
          <div className="stat-value" style={{ color: "var(--red)" }}>{neverVisited.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Overdue Visits</div>
          <div className="stat-value" style={{ color: "var(--yellow)" }}>{overdue.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total Alerts</div>
          <div className="stat-value">{alerts.length}</div>
        </div>
      </div>

      {loading ? (
        <div style={{ color: "var(--text-muted)", padding: "40px 0", textAlign: "center" }}>Loading...</div>
      ) : alerts.length === 0 ? (
        <div className="empty-state">
          <p>No visit alerts</p>
          <p>All assigned schools have been visited recently</p>
        </div>
      ) : (
        <div className="card">
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>School</th>
                  <th>City</th>
                  <th>Pipeline Stage</th>
                  <th>Last Visit</th>
                  <th>Days Since Visit</th>
                </tr>
              </thead>
              <tbody>
                {alerts.map((a: any) => (
                  <tr key={a.school?.id ?? a.schoolId} style={{ cursor: "pointer" }}
                    onClick={() => { window.location.href = `/bd/schools/${a.school?.id ?? a.schoolId}`; }}>
                    <td style={{ fontWeight: 500 }}>
                      <Link href={`/bd/schools/${a.school?.id ?? a.schoolId}`}
                        style={{ color: "var(--text-primary)", textDecoration: "none" }}
                        onClick={(e) => e.stopPropagation()}>
                        {a.school?.name ?? a.schoolName ?? "—"}
                      </Link>
                    </td>
                    <td style={{ color: "var(--text-secondary)", fontSize: 12.5 }}>
                      {a.school?.city ?? a.city ?? "—"}
                    </td>
                    <td>
                      <span style={{
                        fontSize: 11.5, fontWeight: 600, fontFamily: "monospace",
                        padding: "2px 6px", borderRadius: "var(--radius)",
                        background: "var(--bg)", border: "1px solid var(--border)",
                        color: "var(--text-secondary)",
                      }}>
                        {a.school?.pipelineStage ?? a.pipelineStage ?? "—"}
                      </span>
                    </td>
                    <td style={{ fontSize: 12.5, color: "var(--text-muted)" }}>
                      {a.neverVisited
                        ? <span style={{ color: "var(--red)", fontWeight: 600 }}>Never</span>
                        : a.lastVisit ? new Date(a.lastVisit).toLocaleDateString() : "—"}
                    </td>
                    <td>
                      <span style={{
                        fontWeight: 700,
                        color: a.neverVisited ? "var(--red)" : a.daysAgo > 60 ? "var(--red)" : "var(--yellow)",
                      }}>
                        {a.neverVisited ? "Never visited" : `${a.daysAgo}d ago`}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}
