"use client";

import { useEffect, useState } from "react";

export default function BDTasksPage() {
  const [tasks, setTasks]   = useState<any[]>([]);
  const [team, setTeam]     = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ title: "", description: "", dueDate: "", assignedToId: "", priority: "MEDIUM" });
  const [msg, setMsg] = useState({ text: "", ok: false });
  const [submitting, setSubmitting] = useState(false);
  const [filterStatus, setFilterStatus] = useState("ALL");

  const fetchAll = async () => {
    setLoading(true);
    const [tasksRes, teamRes] = await Promise.all([
      fetch("/api/bd/tasks", { credentials: "include" }).then((r) => r.json()),
      fetch("/api/bd/team",  { credentials: "include" }).then((r) => r.json()),
    ]);
    setTasks(Array.isArray(tasksRes) ? tasksRes : []);
    setTeam(Array.isArray(teamRes)   ? teamRes  : []);
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, []);

  const createTask = async () => {
    if (!form.title || !form.dueDate || !form.assignedToId) {
      setMsg({ text: "Title, due date, and assignee are required.", ok: false });
      return;
    }
    setSubmitting(true);
    setMsg({ text: "", ok: false });
    const res = await fetch("/api/bd/tasks", {
      method: "POST", headers: { "Content-Type": "application/json" },
      credentials: "include", body: JSON.stringify(form),
    });
    const data = await res.json();
    if (data.id) {
      setMsg({ text: "Task created.", ok: true });
      setForm({ title: "", description: "", dueDate: "", assignedToId: "", priority: "MEDIUM" });
      fetchAll();
    } else {
      setMsg({ text: data.error || "Failed to create task.", ok: false });
    }
    setSubmitting(false);
  };

  const now = new Date();
  const filtered = tasks.filter((t) => {
    if (filterStatus === "OVERDUE") return t.status !== "COMPLETED" && new Date(t.dueDate) < now;
    if (filterStatus === "HIGH")    return t.priority === "HIGH" && t.status !== "COMPLETED";
    return filterStatus === "ALL" || t.status === filterStatus;
  });

  const counts = {
    total:     tasks.length,
    pending:   tasks.filter((t) => t.status === "PENDING").length,
    completed: tasks.filter((t) => t.status === "COMPLETED").length,
    overdue:   tasks.filter((t) => t.status !== "COMPLETED" && new Date(t.dueDate) < now).length,
  };

  return (
    <>
      <div className="page-header">
        <h1>Task Management</h1>
        <p>Assign and track tasks</p>
      </div>

      {/* ── Stats ── */}
      <div className="stats-grid" style={{ marginBottom: 24 }}>
        {[
          { label: "Total",     value: counts.total,     color: "var(--text-primary)" },
          { label: "Pending",   value: counts.pending,   color: "var(--yellow)" },
          { label: "Completed", value: counts.completed, color: "var(--green)" },
          { label: "Overdue",   value: counts.overdue,   color: counts.overdue > 0 ? "var(--red)" : "var(--text-primary)" },
        ].map((s) => (
          <div key={s.label} className="stat-card">
            <div className="stat-label">{s.label}</div>
            <div className="stat-value" style={{ color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* ── Create Task Form ── */}
      <div className="card" style={{ marginBottom: 20 }}>
        <h2 style={{ marginBottom: 16 }}>Assign New Task</h2>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div>
            <label className="form-label">Title *</label>
            <input className="input" placeholder="e.g. Visit School 5" value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </div>
          <div>
            <label className="form-label">Assign To *</label>
            <select className="input" value={form.assignedToId}
              onChange={(e) => setForm({ ...form, assignedToId: e.target.value })}>
              <option value="">Select team member...</option>
              {team.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          </div>
          <div>
            <label className="form-label">Due Date *</label>
            <input className="input" type="date" value={form.dueDate}
              onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
          </div>
          <div>
            <label className="form-label">Priority</label>
            <select className="input" value={form.priority}
              onChange={(e) => setForm({ ...form, priority: e.target.value })}>
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
            </select>
          </div>
          <div style={{ gridColumn: "1 / -1" }}>
            <label className="form-label">Description</label>
            <textarea className="input" rows={3} placeholder="Optional details..."
              value={form.description} style={{ resize: "vertical" }}
              onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
        </div>
        {msg.text && (
          <div className={`alert ${msg.ok ? "alert-success" : "alert-error"}`} style={{ marginTop: 12 }}>{msg.text}</div>
        )}
        <div style={{ marginTop: 14 }}>
          <button className="btn btn-primary" disabled={submitting} onClick={createTask}>
            {submitting ? "Creating..." : "Create Task"}
          </button>
        </div>
      </div>

      {/* ── Task List ── */}
      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <h2 style={{ margin: 0 }}>All Tasks</h2>
          <div style={{ display: "flex", gap: 6 }}>
            {["ALL", "PENDING", "COMPLETED", "OVERDUE", "HIGH"].map((s) => (
              <button
                key={s}
                onClick={() => setFilterStatus(s)}
                style={{
                  padding: "4px 12px", borderRadius: 99, fontSize: 12, fontWeight: 500,
                  border: "1px solid var(--border)", cursor: "pointer", fontFamily: "inherit",
                  background: filterStatus === s ? "var(--accent)" : "var(--surface)",
                  color: filterStatus === s ? "#fff" : "var(--text-secondary)",
                  transition: "all 0.15s",
                }}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div style={{ color: "var(--text-muted)", padding: "40px 0", textAlign: "center" }}>Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <p>No {filterStatus !== "ALL" ? filterStatus.toLowerCase() : ""} tasks</p>
            <p>Create a task using the form above</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Task</th>
                  <th>Assigned To</th>
                  <th>Due Date</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((task) => {
                  const overdue = task.status !== "COMPLETED" && new Date(task.dueDate) < now;
                  return (
                    <tr key={task.id}>
                      <td>
                        <div style={{ fontWeight: 500, fontSize: 13.5 }}>{task.title}</div>
                        {task.description && (
                          <div style={{ color: "var(--text-muted)", fontSize: 12, marginTop: 2 }}>
                            {task.description.length > 60 ? task.description.slice(0, 60) + "…" : task.description}
                          </div>
                        )}
                        {overdue && (
                          <span className="badge badge-red" style={{ marginTop: 4, display: "inline-block" }}>Overdue</span>
                        )}
                      </td>
                      <td style={{ color: "var(--text-secondary)", fontSize: 13 }}>
                        {task.assignedTo?.name ?? "—"}
                      </td>
                      <td style={{ color: overdue ? "var(--red)" : "var(--text-muted)", fontSize: 12.5 }}>
                        {new Date(task.dueDate).toLocaleDateString()}
                      </td>
                      <td>
                        {task.status === "COMPLETED"
                          ? <span className="badge badge-green">Completed</span>
                          : <span className="badge badge-blue">Pending</span>}
                      </td>
                      <td>
                        {task.status !== "COMPLETED" && (
                          <button className="btn btn-success" style={{ fontSize: 12, padding: "4px 10px" }}>
                            Complete
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
