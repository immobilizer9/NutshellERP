"use client";

import { useEffect, useState } from "react";
import Badge from "@/app/components/Badge";
import VisitAlerts from "@/app/components/VisitAlerts";
import DeliveryAlerts from "@/app/components/DeliveryAlerts";

export default function BDDashboard() {
  const [data, setData] = useState<any>(null);
  const [team, setTeam] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [taskForm, setTaskForm] = useState({ title: "", description: "", dueDate: "", assignedToId: "" });
  const [taskMsg, setTaskMsg] = useState({ text: "", ok: false });
  const [submitting, setSubmitting] = useState(false);

  const fetchAll = async () => {
    setLoading(true);
    const [a, t] = await Promise.all([
      fetch("/api/bd/analytics", { credentials: "include" }).then((r) => r.json()),
      fetch("/api/bd/team",      { credentials: "include" }).then((r) => r.json()),
    ]);
    setData(a);
    setTeam(Array.isArray(t) ? t : []);
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, []);

  const approve = async (orderId: string) => {
    await fetch("/api/bd/approve-order", {
      method: "POST", headers: { "Content-Type": "application/json" },
      credentials: "include", body: JSON.stringify({ orderId }),
    });
    fetchAll();
  };

  const reject = async (orderId: string) => {
    await fetch("/api/bd/reject-order", {
      method: "POST", headers: { "Content-Type": "application/json" },
      credentials: "include", body: JSON.stringify({ orderId }),
    });
    fetchAll();
  };

  const createTask = async () => {
    if (!taskForm.title || !taskForm.dueDate || !taskForm.assignedToId) {
      setTaskMsg({ text: "Please fill in all required fields.", ok: false });
      return;
    }
    setSubmitting(true);
    setTaskMsg({ text: "", ok: false });
    const res = await fetch("/api/bd/tasks", {
      method: "POST", headers: { "Content-Type": "application/json" },
      credentials: "include", body: JSON.stringify(taskForm),
    });
    const result = await res.json();
    if (result.id) {
      setTaskMsg({ text: "Task created.", ok: true });
      setTaskForm({ title: "", description: "", dueDate: "", assignedToId: "" });
      fetchAll();
    } else {
      setTaskMsg({ text: result.error || "Failed.", ok: false });
    }
    setSubmitting(false);
  };

  const daysLeftLabel = (r: any) => {
    const now = new Date();
    const daysLeft = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate() - now.getDate();
    return `${daysLeft}d left`;
  };

  if (loading) return <div style={{ color: "var(--text-muted)", padding: "40px 0", textAlign: "center" }}>Loading...</div>;
  if (!data || data.error) return <div className="alert alert-error">Failed to load dashboard.</div>;

  return (
    <>
      <div className="page-header">
        <h1>BD Dashboard</h1>
        <p>Business development overview</p>
      </div>

      {/* ── Stats ── */}
      <div className="stats-grid" style={{ marginBottom: 24 }}>
        {[
          { label: "Team Orders",      value: data.totalOrders,    color: "var(--text-primary)" },
          { label: "Revenue",          value: `₹${data.totalRevenue.toLocaleString()}`, color: "var(--green)" },
          { label: "Pending Approval", value: data.pendingOrders?.length ?? 0, color: "var(--yellow)" },
          { label: "Task Completion",  value: `${data.completionRate}%`, color: "var(--accent)" },
          { label: "Reports Today",    value: `${data.reportTodayCount ?? 0}/${data.reportTodayTotal ?? 0}`,
            color: (data.reportTodayCount ?? 0) === (data.reportTodayTotal ?? 0) ? "var(--green)" : "var(--yellow)" },
        ].map((s) => (
          <div key={s.label} className="stat-card">
            <div className="stat-label">{s.label}</div>
            <div className="stat-value" style={{ color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* ── At-risk reps alert ── */}
      {data.atRiskReps?.length > 0 && (
        <div className="alert alert-error" style={{ marginBottom: 16 }}>
          <strong>At-Risk Reps:</strong>{" "}
          {data.atRiskReps.map((r: any) => (
            <span key={r.userId} style={{ marginRight: 12 }}>
              {r.name} — {r.achievementPct}% of target ({daysLeftLabel(r)})
            </span>
          ))}
        </div>
      )}

      <DeliveryAlerts horizonDays={7} />
      <VisitAlerts thresholdDays={30} />

      <div style={{ display: "grid", gridTemplateColumns: "3fr 2fr", gap: 16, marginBottom: 16 }}>
        {/* ── Pending Orders ── */}
        <div className="card">
          <h2 style={{ marginBottom: 14 }}>
            Pending Approvals
            {data.pendingOrders?.length > 0 && (
              <span className="badge badge-yellow" style={{ marginLeft: 8, verticalAlign: "middle" }}>
                {data.pendingOrders.length}
              </span>
            )}
          </h2>
          {!data.pendingOrders?.length ? (
            <div className="empty-state">
              <p>All caught up</p>
              <p>No orders waiting for approval</p>
            </div>
          ) : (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>School</th>
                    <th>Rep Name</th>
                    <th style={{ textAlign: "right" }}>Amount</th>
                    <th>Date</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {data.pendingOrders.map((order: any) => (
                    <tr key={order.id}>
                      <td style={{ fontWeight: 500 }}>{order.school?.name ?? "Unknown School"}</td>
                      <td style={{ color: "var(--text-secondary)" }}>{order.salesUser?.name ?? "—"}</td>
                      <td style={{ textAlign: "right", fontFamily: "var(--font-mono, monospace)", fontSize: 13 }}>
                        ₹{order.netAmount?.toLocaleString()}
                      </td>
                      <td style={{ color: "var(--text-muted)", fontSize: 12.5 }}>
                        {new Date(order.createdAt).toLocaleDateString()}
                      </td>
                      <td>
                        <div style={{ display: "flex", gap: 6 }}>
                          <button className="btn btn-success" style={{ fontSize: 12, padding: "4px 10px" }} onClick={() => approve(order.id)}>Approve</button>
                          <button className="btn btn-danger"  style={{ fontSize: 12, padding: "4px 10px" }} onClick={() => reject(order.id)}>Reject</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ── Task Overview ── */}
        <div className="card">
          <h2 style={{ marginBottom: 14 }}>Task Overview</h2>
          <div className="stats-grid" style={{ marginBottom: 14 }}>
            {[
              { label: "Total",     val: data.totalTasks,     color: "var(--text-primary)" },
              { label: "Completed", val: data.completedTasks, color: "var(--green)" },
              { label: "Pending",   val: data.pendingTasks,   color: "var(--yellow)" },
              { label: "Overdue",   val: data.overdueTasks,   color: "var(--red)" },
            ].map((s) => (
              <div key={s.label} className="stat-card">
                <div className="stat-label">{s.label}</div>
                <div className="stat-value" style={{ color: s.color }}>{s.val}</div>
              </div>
            ))}
          </div>
          {/* Progress bar */}
          <div style={{ background: "var(--border)", borderRadius: 99, height: 5, overflow: "hidden" }}>
            <div style={{ width: `${data.completionRate}%`, height: "100%", background: "var(--accent)", borderRadius: 99, transition: "width 0.4s ease" }} />
          </div>
          <p style={{ color: "var(--text-muted)", fontSize: 12, marginTop: 6 }}>{data.completionRate}% of tasks completed</p>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
        {/* ── Assign Task ── */}
        <div className="card">
          <h2 style={{ marginBottom: 14 }}>Assign New Task</h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div>
              <label className="form-label">Title *</label>
              <input className="input" placeholder="e.g. Follow up with School 3" value={taskForm.title}
                onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })} />
            </div>
            <div>
              <label className="form-label">Assign To *</label>
              <select className="input" value={taskForm.assignedToId}
                onChange={(e) => setTaskForm({ ...taskForm, assignedToId: e.target.value })}>
                <option value="">Select team member...</option>
                {team.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </div>
            <div>
              <label className="form-label">Due Date *</label>
              <input className="input" type="date" value={taskForm.dueDate}
                onChange={(e) => setTaskForm({ ...taskForm, dueDate: e.target.value })} />
            </div>
            <div>
              <label className="form-label">Description</label>
              <input className="input" placeholder="Optional details..." value={taskForm.description}
                onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })} />
            </div>
          </div>
          {taskMsg.text && (
            <div className={`alert ${taskMsg.ok ? "alert-success" : "alert-error"}`} style={{ marginTop: 10 }}>{taskMsg.text}</div>
          )}
          <div style={{ marginTop: 12 }}>
            <button className="btn btn-primary" disabled={submitting} onClick={createTask}>
              {submitting ? "Creating..." : "Create Task"}
            </button>
          </div>
        </div>

        {/* ── Team Activity ── */}
        <div className="card">
          <h2 style={{ marginBottom: 14 }}>Team Activity</h2>
          {!data.salesActivityStatus?.length ? (
            <div className="empty-state"><p>No team members found</p></div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
              {data.salesActivityStatus.map((m: any, i: number) => (
                <div
                  key={m.userId}
                  style={{
                    padding: "10px 0",
                    borderBottom: i < data.salesActivityStatus.length - 1 ? "1px solid var(--border)" : "none",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <p style={{ fontWeight: 500, fontSize: 13.5, margin: 0 }}>{m.name}</p>
                      {m.reportedToday
                        ? <span className="badge badge-green" style={{ fontSize: 10 }}>Reported</span>
                        : <span className="badge badge-gray"  style={{ fontSize: 10 }}>No report</span>
                      }
                      {m.atRisk && <span className="badge badge-red" style={{ fontSize: 10 }}>At Risk</span>}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span
                        style={{
                          width: 8, height: 8, borderRadius: "50%", display: "inline-block",
                          background: m.isInactive ? "var(--red)" : "var(--green)",
                          flexShrink: 0,
                        }}
                      />
                      <span style={{ fontSize: 12, color: m.isInactive ? "var(--red)" : "var(--green)" }}>
                        {m.isInactive ? "Inactive" : "Active"}
                      </span>
                    </div>
                  </div>
                  {/* Target progress */}
                  {m.targetRevenue > 0 && (
                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--text-muted)", marginBottom: 3 }}>
                        <span>₹{m.monthRevenue.toLocaleString()} / ₹{m.targetRevenue.toLocaleString()}</span>
                        <span>{m.achievementPct}%</span>
                      </div>
                      <div style={{ background: "var(--border)", borderRadius: 99, height: 4, overflow: "hidden" }}>
                        <div style={{
                          width: `${Math.min(m.achievementPct ?? 0, 100)}%`, height: "100%", borderRadius: 99,
                          background: m.atRisk ? "var(--red)" : m.achievementPct >= 75 ? "var(--green)" : "var(--accent)",
                          transition: "width 0.4s ease",
                        }} />
                      </div>
                    </div>
                  )}
                  <p style={{ color: "var(--text-muted)", fontSize: 11.5, margin: "4px 0 0" }}>
                    {m.visitsThisMonth} visits this month
                    {m.lastActivity && ` · Last active ${new Date(m.lastActivity).toLocaleDateString()}`}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Activity Timeline ── */}
      {data.timeline?.length > 0 && (
        <div className="card">
          <h2 style={{ marginBottom: 14 }}>Recent Activity</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            {data.timeline.slice(0, 12).map((item: any, i: number) => {
              const typeColor: Record<string, string> = {
                REPORT: "badge-blue", ORDER: "badge-green", TASK: "badge-indigo",
              };
              return (
                <div
                  key={i}
                  style={{
                    display: "flex", alignItems: "flex-start", gap: 10, padding: "9px 0",
                    borderBottom: i < Math.min(data.timeline.length, 12) - 1 ? "1px solid var(--border)" : "none",
                  }}
                >
                  <span className={`badge ${typeColor[item.type] ?? "badge-gray"}`} style={{ marginTop: 1, flexShrink: 0 }}>
                    {item.type}
                  </span>
                  <div>
                    <p style={{ margin: 0, fontSize: 13.5 }}>
                      <strong>{item.user}</strong> — {item.description}
                    </p>
                    <p style={{ color: "var(--text-muted)", fontSize: 11.5, margin: "2px 0 0" }}>
                      {new Date(item.time).toLocaleString()}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}
