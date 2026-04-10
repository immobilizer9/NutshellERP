"use client";

import { useEffect, useState } from "react";

const STAGE_ORDER = ["LEAD","CONTACTED","VISITED","PROPOSAL_SENT","NEGOTIATION","CLOSED_WON","CLOSED_LOST"];
const STAGE_LABELS: Record<string, string> = {
  LEAD: "Lead", CONTACTED: "Contacted", VISITED: "Visited",
  PROPOSAL_SENT: "Proposal Sent", NEGOTIATION: "Negotiation",
  CLOSED_WON: "Closed Won", CLOSED_LOST: "Closed Lost",
};
const STAGE_COLORS: Record<string, string> = {
  LEAD: "#9ca3af", CONTACTED: "#60a5fa", VISITED: "#a78bfa",
  PROPOSAL_SENT: "#fbbf24", NEGOTIATION: "#fb923c",
  CLOSED_WON: "#34d399", CLOSED_LOST: "#f87171",
};

export default function MetricsPage() {
  const [data, setData]     = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState("");

  useEffect(() => {
    fetch("/api/admin/metrics", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => { if (d.error) setError(d.error); else setData(d); })
      .catch(() => setError("Failed to load metrics."))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ color: "var(--text-muted)", padding: "40px 0", textAlign: "center" }}>Loading...</div>;
  if (error)   return <div className="alert alert-error">{error}</div>;

  const totalSchoolsInPipeline = Object.values(data.stageCount as Record<string, number>).reduce((s: number, v: any) => s + v, 0);

  return (
    <>
      <div className="page-header">
        <h1>System Metrics</h1>
        <p>Organisation-wide health overview</p>
      </div>

      {/* ── Users ── */}
      <div className="card" style={{ marginBottom: 16 }}>
        <h2 style={{ marginBottom: 14 }}>Users</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10 }}>
          {[
            { label: "Total Users",  val: data.totalUsers,  color: "var(--text-primary)" },
            { label: "Active Users", val: data.activeUsers, color: "var(--green)" },
            ...Object.entries(data.roleCount as Record<string, number>).map(([role, count]) => ({
              label: role.replace("_", " "), val: count, color: "var(--accent)",
            })),
          ].map((s) => (
            <div key={s.label} style={{ background: "var(--bg)", borderRadius: "var(--radius)", border: "1px solid var(--border)", padding: "12px 14px" }}>
              <div style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>{s.label}</div>
              <div style={{ fontSize: "1.6rem", fontWeight: 700, color: s.color }}>{s.val}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Revenue + Orders ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
        <div className="card">
          <h2 style={{ marginBottom: 14 }}>Revenue</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {[
              { label: "Total Approved Revenue", val: `₹${data.totalRevenue.toLocaleString()}`, color: "var(--green)" },
              { label: "Gross Billed",            val: `₹${data.totalGross.toLocaleString()}`,   color: "var(--text-primary)" },
              { label: "Total Returns",           val: `₹${data.totalReturns.toLocaleString()}`, color: "var(--red)" },
              { label: "Avg Order Value",         val: `₹${data.avgOrderValue.toLocaleString()}`, color: "var(--accent)" },
              { label: "Revenue (Last 30 Days)",  val: `₹${data.recentRevenue.toLocaleString()}`, color: "var(--yellow)" },
            ].map((s) => (
              <div key={s.label} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, paddingBottom: 8, borderBottom: "1px solid var(--border)" }}>
                <span style={{ color: "var(--text-secondary)" }}>{s.label}</span>
                <span style={{ fontWeight: 700, color: s.color, fontFamily: "monospace" }}>{s.val}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <h2 style={{ marginBottom: 14 }}>Orders</h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {[
              { label: "Total",    val: data.totalOrders,    color: "var(--text-primary)" },
              { label: "Approved", val: data.approvedOrders, color: "var(--green)"  },
              { label: "Pending",  val: data.pendingOrders,  color: "var(--yellow)" },
              { label: "Rejected", val: data.rejectedOrders, color: "var(--red)"    },
            ].map((s) => (
              <div key={s.label} style={{ background: "var(--bg)", borderRadius: "var(--radius)", border: "1px solid var(--border)", padding: "12px 14px" }}>
                <div style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>{s.label}</div>
                <div style={{ fontSize: "1.6rem", fontWeight: 700, color: s.color }}>{s.val}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Pipeline ── */}
      <div className="card" style={{ marginBottom: 16 }}>
        <h2 style={{ marginBottom: 14 }}>Pipeline — {totalSchoolsInPipeline} Schools</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {STAGE_ORDER.map((stage) => {
            const count = (data.stageCount as Record<string, number>)[stage] ?? 0;
            const pct   = totalSchoolsInPipeline > 0 ? (count / totalSchoolsInPipeline) * 100 : 0;
            return (
              <div key={stage}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
                  <span style={{ color: "var(--text-secondary)", fontWeight: 500 }}>{STAGE_LABELS[stage]}</span>
                  <span style={{ color: "var(--text-muted)" }}>{count} ({Math.round(pct)}%)</span>
                </div>
                <div style={{ height: 6, borderRadius: 3, background: "var(--border)", overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${pct}%`, background: STAGE_COLORS[stage], borderRadius: 3, transition: "width 0.5s" }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Tasks + Field Activity ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
        <div className="card">
          <h2 style={{ marginBottom: 14 }}>Tasks</h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
            {[
              { label: "Total",     val: data.totalTasks,     color: "var(--text-primary)" },
              { label: "Completed", val: data.completedTasks, color: "var(--green)"  },
              { label: "Overdue",   val: data.overdueTasks,   color: data.overdueTasks > 0 ? "var(--red)" : "var(--text-primary)" },
              { label: "Rate",      val: `${data.completionRate}%`, color: "var(--accent)" },
            ].map((s) => (
              <div key={s.label} style={{ background: "var(--bg)", borderRadius: "var(--radius)", border: "1px solid var(--border)", padding: "10px 12px" }}>
                <div style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 3 }}>{s.label}</div>
                <div style={{ fontSize: "1.4rem", fontWeight: 700, color: s.color }}>{s.val}</div>
              </div>
            ))}
          </div>
          <div style={{ background: "var(--border)", borderRadius: 99, height: 6, overflow: "hidden" }}>
            <div style={{ width: `${data.completionRate}%`, height: "100%", background: "var(--accent)", borderRadius: 99, transition: "width 0.5s" }} />
          </div>
          <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 6 }}>{data.completionRate}% completion rate</p>
        </div>

        <div className="card">
          <h2 style={{ marginBottom: 14 }}>Field Activity</h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {[
              { label: "Total Visits",       val: data.totalVisits,   color: "var(--text-primary)" },
              { label: "Visits (7 Days)",    val: data.recentVisits,  color: "var(--accent)" },
              { label: "Daily Reports",      val: data.totalReports,  color: "var(--text-primary)" },
              { label: "Reports (7 Days)",   val: data.recentReports, color: "var(--accent)" },
            ].map((s) => (
              <div key={s.label} style={{ background: "var(--bg)", borderRadius: "var(--radius)", border: "1px solid var(--border)", padding: "10px 12px" }}>
                <div style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 3 }}>{s.label}</div>
                <div style={{ fontSize: "1.4rem", fontWeight: 700, color: s.color }}>{s.val}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Recent Audit Activity ── */}
      {data.recentAudit?.length > 0 && (
        <div className="card">
          <h2 style={{ marginBottom: 14 }}>Recent Activity</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {data.recentAudit.map((log: any, i: number) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid var(--border)", fontSize: 13 }}>
                <div>
                  <span style={{ fontWeight: 500 }}>{log.action}</span>
                  {log.entity && <span style={{ color: "var(--text-muted)", marginLeft: 6 }}>· {log.entity}</span>}
                  {log.userName && <span style={{ color: "var(--text-secondary)", marginLeft: 6 }}>by {log.userName}</span>}
                </div>
                <span style={{ color: "var(--text-muted)", fontSize: 12 }}>
                  {new Date(log.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
