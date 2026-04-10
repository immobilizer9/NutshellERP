"use client";

import { useEffect, useState } from "react";

const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

function progressColor(pct: number): string {
  if (pct >= 100) return "var(--green)";
  if (pct >= 75)  return "var(--accent)";
  return "var(--yellow)";
}

function StatusBadge({ pct }: { pct: number }) {
  if (pct >= 75) return <span className="badge badge-green">On Track</span>;
  if (pct >= 50) return <span className="badge badge-yellow">At Risk</span>;
  return <span className="badge badge-red">Behind</span>;
}

export default function TeamPerformancePage() {
  const now = new Date();
  const [month, setMonth]   = useState(now.getMonth() + 1);
  const [year, setYear]     = useState(now.getFullYear());
  const [data, setData]     = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const years = [now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1];

  const fetchData = async () => {
    setLoading(true);
    const res  = await fetch(`/api/bd/team-performance?month=${month}&year=${year}`, { credentials: "include" });
    const json = await res.json();
    setData(json);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [month, year]);

  const members: any[] = data?.members ?? [];

  // Team aggregates derived from members array
  const teamRevAchieved = members.reduce((s, m) => s + (m.achievedRevenue ?? 0), 0);
  const teamRevTarget   = members.reduce((s, m) => s + (m.revenueTarget  ?? 0), 0);
  const teamOrdAchieved = members.reduce((s, m) => s + (m.achievedOrders ?? 0), 0);
  const teamOrdTarget   = members.reduce((s, m) => s + (m.ordersTarget   ?? 0), 0);

  const teamRevPct = teamRevTarget > 0 ? Math.min(100, Math.round((teamRevAchieved / teamRevTarget) * 100)) : 0;
  const teamOrdPct = teamOrdTarget > 0 ? Math.min(100, Math.round((teamOrdAchieved / teamOrdTarget) * 100)) : 0;

  return (
    <>
      <div className="page-header">
        <h1>Team Performance</h1>
        <p>Monthly performance vs targets</p>
      </div>

      {/* Period selector */}
      <div style={{ display: "flex", gap: 10, marginBottom: 24, flexWrap: "wrap" }}>
        <select
          className="input"
          value={month}
          onChange={(e) => setMonth(Number(e.target.value))}
          style={{ width: 160 }}
        >
          {MONTHS.map((m, i) => (
            <option key={i} value={i + 1}>{m}</option>
          ))}
        </select>
        <select
          className="input"
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
          style={{ width: 100 }}
        >
          {years.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>

      {loading ? (
        <div style={{ color: "var(--text-muted)", padding: "40px 0", textAlign: "center" }}>Loading...</div>
      ) : (
        <>
          {/* Team summary cards */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
            {/* Team Revenue */}
            <div className="card">
              <div style={{ fontSize: 12, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>
                Team Revenue
              </div>
              <div style={{ fontSize: "1.6rem", fontWeight: 700, marginBottom: 4 }}>
                ₹{teamRevAchieved.toLocaleString()}
                <span style={{ fontSize: "1rem", fontWeight: 400, color: "var(--text-muted)" }}>
                  {" "}/ ₹{teamRevTarget.toLocaleString()}
                </span>
              </div>
              <div style={{ height: 8, borderRadius: 4, background: "var(--border)", overflow: "hidden", marginBottom: 6 }}>
                <div style={{
                  height: "100%", borderRadius: 4,
                  width: `${teamRevPct}%`,
                  background: progressColor(teamRevPct),
                  transition: "width 0.4s",
                }} />
              </div>
              <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{teamRevPct}% achieved</div>
            </div>

            {/* Team Orders */}
            <div className="card">
              <div style={{ fontSize: 12, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>
                Team Orders
              </div>
              <div style={{ fontSize: "1.6rem", fontWeight: 700, marginBottom: 4 }}>
                {teamOrdAchieved}
                <span style={{ fontSize: "1rem", fontWeight: 400, color: "var(--text-muted)" }}>
                  {" "}/ {teamOrdTarget}
                </span>
              </div>
              <div style={{ height: 8, borderRadius: 4, background: "var(--border)", overflow: "hidden", marginBottom: 6 }}>
                <div style={{
                  height: "100%", borderRadius: 4,
                  width: `${teamOrdPct}%`,
                  background: progressColor(teamOrdPct),
                  transition: "width 0.4s",
                }} />
              </div>
              <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{teamOrdPct}% achieved</div>
            </div>
          </div>

          {/* Per-member table */}
          {members.length === 0 ? (
            <div className="card">
              <div className="empty-state">
                <p>No team members yet</p>
                <p>Add sales reps to your team to track performance here</p>
              </div>
            </div>
          ) : (
            <div className="card" style={{ padding: 0, overflow: "hidden" }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Revenue Target</th>
                    <th>Achieved</th>
                    <th>%</th>
                    <th>Orders Target</th>
                    <th>Achieved</th>
                    <th>Visits</th>
                    <th>Last Visit</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {members.map((member: any) => {
                    const revPct = member.revenueTarget > 0
                      ? Math.round((member.achievedRevenue / member.revenueTarget) * 100)
                      : 0;
                    const isExpanded = expandedId === member.userId;

                    return (
                      <>
                        <tr
                          key={member.userId}
                          style={{ cursor: "pointer" }}
                          onClick={() => setExpandedId(isExpanded ? null : member.userId)}
                        >
                          <td style={{ fontWeight: 500 }}>{member.name}</td>
                          <td style={{ fontFamily: "monospace", fontSize: 13, color: "var(--text-muted)" }}>
                            {member.revenueTarget > 0
                              ? `₹${member.revenueTarget.toLocaleString()}`
                              : <span style={{ color: "var(--text-muted)" }}>—</span>}
                          </td>
                          <td style={{ fontFamily: "monospace", fontSize: 13, fontWeight: 600 }}>
                            ₹{(member.achievedRevenue ?? 0).toLocaleString()}
                          </td>
                          <td style={{ fontWeight: 600, color: progressColor(revPct) }}>
                            {revPct}%
                          </td>
                          <td>
                            {member.ordersTarget > 0
                              ? member.ordersTarget
                              : <span style={{ color: "var(--text-muted)" }}>—</span>}
                          </td>
                          <td style={{ fontWeight: 600 }}>{member.achievedOrders ?? 0}</td>
                          <td>{member.visitCount ?? member.visitsThisMonth ?? 0}</td>
                          <td style={{ color: "var(--text-muted)", fontSize: 12.5 }}>
                            {(member.lastVisit ?? member.lastVisitDate)
                              ? new Date(member.lastVisit ?? member.lastVisitDate).toLocaleDateString()
                              : <span style={{ color: "var(--text-muted)" }}>—</span>}
                          </td>
                          <td><StatusBadge pct={revPct} /></td>
                        </tr>
                        {isExpanded && (
                          <tr key={`${member.userId}-exp`}>
                            <td colSpan={9} style={{
                              background: "var(--bg)", padding: "12px 16px",
                              borderBottom: "1px solid var(--border-soft)",
                            }}>
                              <p style={{ margin: 0, fontSize: 13, color: "var(--text-secondary)" }}>
                                View full details in{" "}
                                <a href="/bd/schools" style={{ color: "var(--accent)", textDecoration: "none" }}>
                                  Schools
                                </a>{" "}
                                &amp;{" "}
                                <a href="/bd/orders" style={{ color: "var(--accent)", textDecoration: "none" }}>
                                  Orders
                                </a>.
                              </p>
                            </td>
                          </tr>
                        )}
                      </>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </>
  );
}
