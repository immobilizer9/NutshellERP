"use client";

import { useEffect, useState } from "react";

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function isOverdue(dueDate: string, status: string) {
  return status !== "COMPLETED" && new Date(dueDate) < new Date();
}

export default function TasksPage() {
  const [modules, setModules]   = useState<string[]>([]);
  const [tasks, setTasks]       = useState<any[]>([]);
  const [team, setTeam]         = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [completing, setCompleting] = useState<string | null>(null);
  const [form, setForm] = useState({ title: "", description: "", dueDate: "", assignedToId: "", priority: "MEDIUM" });
  const [msg, setMsg] = useState({ text: "", ok: false });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => { if (d?.user?.modules) setModules(d.user.modules); });
  }, []);

  const isManager = modules.includes("TEAM_MANAGEMENT");

  const fetchAll = async () => {
    setLoading(true);
    if (isManager) {
      const [tasksRes, teamRes] = await Promise.all([
        fetch("/api/bd/tasks", { credentials: "include" }).then((r) => r.json()),
        fetch("/api/bd/team",  { credentials: "include" }).then((r) => r.json()),
      ]);
      setTasks(Array.isArray(tasksRes) ? tasksRes : []);
      setTeam(Array.isArray(teamRes)   ? teamRes  : []);
    } else {
      const tasksRes = await fetch("/api/sales/tasks", { credentials: "include" }).then((r) => r.json());
      setTasks(Array.isArray(tasksRes) ? tasksRes : []);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (modules.length > 0) fetchAll();
  }, [modules]);

  const createTask = async () => {
    if (!form.title || !form.dueDate || !form.assignedToId) {
      setMsg({ text: "Title, due date, and assignee are required.", ok: false }); return;
    }
    setSubmitting(true); setMsg({ text: "", ok: false });
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

  const completeTask = async (taskId: string) => {
    setCompleting(taskId);
    await fetch("/api/sales/complete-task", {
      method: "POST", headers: { "Content-Type": "application/json" },
      credentials: "include", body: JSON.stringify({ taskId }),
    });
    setCompleting(null);
    fetchAll();
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

  const PRIORITY_COLOR: Record<string, string> = { HIGH: "var(--red)", MEDIUM: "var(--yellow)", LOW: "var(--green)" };

  if (loading && modules.length === 0) {
    return <div className="page-header"><h1>Tasks</h1></div>;
  }

  return (
    <>
      <div className="page-header">
        <h1>Tasks</h1>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 20 }}>
        {[
          { label: "Total", value: counts.total },
          { label: "Pending", value: counts.pending },
          { label: "Completed", value: counts.completed },
          { label: "Overdue", value: counts.overdue, color: counts.overdue > 0 ? "var(--red)" : undefined },
        ].map((s) => (
          <div key={s.label} className="card" style={{ textAlign: "center", padding: "12px 8px" }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Create task form (managers only) */}
      {isManager && (
        <div className="card" style={{ marginBottom: 20 }}>
          <h2 style={{ marginBottom: 12 }}>Assign New Task</h2>
          {msg.text && (
            <div className={`alert ${msg.ok ? "alert-success" : "alert-error"}`} style={{ marginBottom: 12 }}>{msg.text}</div>
          )}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div>
              <label className="form-label">Title *</label>
              <input className="input" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="Task title" />
            </div>
            <div>
              <label className="form-label">Assign To *</label>
              <select className="input" value={form.assignedToId} onChange={(e) => setForm((f) => ({ ...f, assignedToId: e.target.value }))}>
                <option value="">Select team member</option>
                {team.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>
            <div>
              <label className="form-label">Due Date *</label>
              <input className="input" type="date" value={form.dueDate} onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))} />
            </div>
            <div>
              <label className="form-label">Priority</label>
              <select className="input" value={form.priority} onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))}>
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
              </select>
            </div>
            <div style={{ gridColumn: "1 / -1" }}>
              <label className="form-label">Description</label>
              <textarea className="input" rows={2} value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="Optional description" />
            </div>
          </div>
          <div style={{ marginTop: 12 }}>
            <button className="btn btn-primary" onClick={createTask} disabled={submitting}>
              {submitting ? "Creating…" : "Create Task"}
            </button>
          </div>
        </div>
      )}

      {/* Filter */}
      <div style={{ display: "flex", gap: 6, marginBottom: 14, flexWrap: "wrap" }}>
        {["ALL", "PENDING", "COMPLETED", "OVERDUE", "HIGH"].map((f) => (
          <button key={f} onClick={() => setFilterStatus(f)}
            className="btn"
            style={{ background: filterStatus === f ? "var(--accent)" : undefined, color: filterStatus === f ? "#fff" : undefined, fontSize: 12 }}>
            {f === "ALL" ? "All" : f.charAt(0) + f.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      {/* Tasks list */}
      {loading ? (
        <p style={{ color: "var(--text-muted)" }}>Loading…</p>
      ) : filtered.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: 32, color: "var(--text-muted)" }}>No tasks found</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {filtered.map((task) => {
            const overdue = isOverdue(task.dueDate, task.status);
            return (
              <div key={task.id} className="card" style={{ padding: "12px 16px", display: "flex", gap: 12, alignItems: "flex-start",
                opacity: task.status === "COMPLETED" ? 0.6 : 1 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 4 }}>
                    <span style={{
                      fontWeight: 600, fontSize: 14,
                      textDecoration: task.status === "COMPLETED" ? "line-through" : "none",
                    }}>{task.title}</span>
                    <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 4,
                      background: `${PRIORITY_COLOR[task.priority]}22`, color: PRIORITY_COLOR[task.priority] }}>
                      {task.priority}
                    </span>
                    {task.status === "COMPLETED" && (
                      <span className="badge badge-green">Done</span>
                    )}
                    {overdue && <span className="badge badge-yellow">Overdue</span>}
                  </div>
                  {task.description && (
                    <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 4 }}>{task.description}</div>
                  )}
                  <div style={{ fontSize: 12, color: "var(--text-muted)", display: "flex", gap: 12 }}>
                    <span>Due: {formatDate(task.dueDate)}</span>
                    {task.assignedTo && <span>Assigned to: {task.assignedTo.name}</span>}
                  </div>
                </div>
                {!isManager && task.status !== "COMPLETED" && (
                  <button className="btn btn-primary" style={{ fontSize: 12, padding: "5px 12px" }}
                    onClick={() => completeTask(task.id)}
                    disabled={completing === task.id}>
                    {completing === task.id ? "…" : "Complete"}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
