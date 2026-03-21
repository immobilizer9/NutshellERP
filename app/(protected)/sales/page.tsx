"use client";

import { useEffect, useState } from "react";
import Badge from "@/app/components/Badge";

export default function SalesPage() {
  const [tasks, setTasks]   = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [report, setReport] = useState({ summary: "", location: "" });
  const [reportMsg, setReportMsg] = useState({ text: "", ok: false });
  const [submittingReport, setSubmittingReport] = useState(false);
  const [completingTask, setCompletingTask] = useState<string | null>(null);

  const fetchTasks = () =>
    fetch("/api/sales/tasks", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setTasks(Array.isArray(d) ? d : []));

  const fetchOrders = () =>
    fetch("/api/orders/list", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setOrders(Array.isArray(d) ? d : []));

  useEffect(() => {
    fetchTasks();
    fetchOrders();
  }, []);

  const completeTask = async (taskId: string) => {
    setCompletingTask(taskId);
    await fetch("/api/sales/complete-task", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ taskId }),
    });
    await fetchTasks();
    setCompletingTask(null);
  };

  const submitReport = () => {
    if (!report.summary) {
      setReportMsg({ text: "Summary is required.", ok: false });
      return;
    }
    setSubmittingReport(true);
    setReportMsg({ text: "", ok: false });

    if (!navigator.geolocation) {
      postReport(null, null);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => postReport(pos.coords.latitude, pos.coords.longitude),
      ()    => postReport(null, null)
    );
  };

  const postReport = async (lat: number | null, lng: number | null) => {
    const res = await fetch("/api/sales/daily-report", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ ...report, latitude: lat, longitude: lng }),
    });
    const data = await res.json();
    if (data.id) {
      setReportMsg({ text: "Report submitted successfully.", ok: true });
      setReport({ summary: "", location: "" });
    } else {
      setReportMsg({ text: data.error || "Submission failed.", ok: false });
    }
    setSubmittingReport(false);
  };

  const pendingTasks   = tasks.filter((t) => t.status === "PENDING");
  const completedTasks = tasks.filter((t) => t.status === "COMPLETED");
  const now = new Date();
  const overdueTasks = pendingTasks.filter((t) => new Date(t.dueDate) < now);

  return (
    <>
      <div className="page-header">
        <h1>Sales Dashboard</h1>
        <p>Your orders, tasks, and daily reports</p>
      </div>

      {/* ── Stats ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 14, marginBottom: 24 }}>
        {[
          { label: "My Orders",     value: orders.length, color: "var(--text-primary)" },
          { label: "Pending Tasks", value: pendingTasks.length, color: "var(--yellow)" },
          { label: "Overdue",       value: overdueTasks.length, color: overdueTasks.length > 0 ? "var(--red)" : "var(--text-primary)" },
          { label: "Completed",     value: completedTasks.length, color: "var(--green)" },
        ].map((s) => (
          <div key={s.label} className="stat-card">
            <div className="stat-label">{s.label}</div>
            <div className="stat-value" style={{ color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
        {/* ── My Tasks ── */}
        <div className="card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <h2 style={{ margin: 0 }}>My Tasks</h2>
            <a href="/orders/new" className="btn btn-primary" style={{ textDecoration: "none", fontSize: 13 }}>
              + New Order
            </a>
          </div>

          {pendingTasks.length === 0 ? (
            <div className="empty-state">
              <p>No pending tasks</p>
              <p>You're all caught up!</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
              {pendingTasks.map((task, i) => {
                const overdue = new Date(task.dueDate) < now;
                return (
                  <div
                    key={task.id}
                    style={{
                      display: "flex", justifyContent: "space-between", alignItems: "center",
                      padding: "10px 0",
                      borderBottom: i < pendingTasks.length - 1 ? "1px solid var(--border-soft)" : "none",
                    }}
                  >
                    <div>
                      <p style={{ fontWeight: 500, fontSize: 13.5, margin: 0 }}>{task.title}</p>
                      <p style={{ fontSize: 12, margin: "2px 0 0", color: overdue ? "var(--red)" : "var(--text-muted)" }}>
                        Due {new Date(task.dueDate).toLocaleDateString()}
                        {overdue && " · Overdue"}
                      </p>
                    </div>
                    <button
                      className="btn btn-success"
                      disabled={completingTask === task.id}
                      onClick={() => completeTask(task.id)}
                      style={{ fontSize: 12 }}
                    >
                      {completingTask === task.id ? "..." : "Complete"}
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {completedTasks.length > 0 && (
            <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid var(--border)" }}>
              <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 8 }}>
                COMPLETED ({completedTasks.length})
              </p>
              {completedTasks.map((task) => (
                <div key={task.id} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0" }}>
                  <p style={{ fontSize: 13.5, color: "var(--text-muted)", textDecoration: "line-through", margin: 0 }}>
                    {task.title}
                  </p>
                  <Badge status="COMPLETED" />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Daily Report ── */}
        <div className="card">
          <h2 style={{ marginBottom: 14 }}>Submit Daily Report</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div>
              <label className="form-label">Summary *</label>
              <textarea
                className="input"
                rows={4}
                placeholder="What did you do today? Schools visited, meetings held, follow-ups done..."
                value={report.summary}
                onChange={(e) => setReport({ ...report, summary: e.target.value })}
                style={{ resize: "vertical" }}
              />
            </div>
            <div>
              <label className="form-label">Location</label>
              <input
                className="input"
                placeholder="e.g. Siliguri North Zone"
                value={report.location}
                onChange={(e) => setReport({ ...report, location: e.target.value })}
              />
            </div>
            {reportMsg.text && (
              <div className={`alert ${reportMsg.ok ? "alert-success" : "alert-error"}`}>
                {reportMsg.text}
              </div>
            )}
            <button
              className="btn btn-primary"
              disabled={submittingReport}
              onClick={submitReport}
              style={{ alignSelf: "flex-start" }}
            >
              {submittingReport ? "Submitting..." : "Submit Report"}
            </button>
            <p style={{ color: "var(--text-muted)", fontSize: 12, margin: 0 }}>
              Your GPS coordinates will be captured automatically if you allow location access.
            </p>
          </div>
        </div>
      </div>

      {/* ── Recent Orders ── */}
      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <h2 style={{ margin: 0 }}>My Orders</h2>
          <a href="/orders" style={{ fontSize: 13, color: "var(--accent)", textDecoration: "none" }}>
            View all →
          </a>
        </div>

        {orders.length === 0 ? (
          <div className="empty-state">
            <p>No orders yet</p>
            <p>Create your first order to get started</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>School</th>
                  <th>Type</th>
                  <th>Gross</th>
                  <th>Net</th>
                  <th>Status</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {orders.slice(0, 8).map((order) => (
                  <tr key={order.id}
                    style={{ cursor: "pointer" }}
                    onClick={() => window.location.href = `/orders/${order.id}`}>
                    <td style={{ fontWeight: 500 }}>{order.school?.name ?? "—"}</td>
                    <td><Badge status={order.type} /></td>
                    <td style={{ fontFamily: "var(--font-mono, monospace)", fontSize: 13 }}>
                      ₹{order.grossAmount.toLocaleString()}
                    </td>
                    <td style={{ fontWeight: 600, fontFamily: "var(--font-mono, monospace)", fontSize: 13 }}>
                      ₹{order.netAmount.toLocaleString()}
                    </td>
                    <td><Badge status={order.status} /></td>
                    <td style={{ color: "var(--text-muted)", fontSize: 12.5 }}>
                      {new Date(order.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
