"use client";

import { useEffect, useState } from "react";

const STATUS_BADGE: Record<string, string> = {
  SCHEDULED: "badge-yellow",
  COMPLETED: "badge-green",
  CANCELLED: "badge-red",
};

const TOPIC_LABELS: Record<string, string> = {
  BOOK_USAGE:        "Book Usage",
  QUIZ_METHODOLOGY:  "Quiz Methodology",
  BOTH:              "Both",
};

export default function TrainingSessionsPage() {
  const [sessions, setSessions] = useState<any[]>([]);
  const [schools,  setSchools]  = useState<any[]>([]);
  const [loading,  setLoading]  = useState(true);

  const [showSchedule, setShowSchedule] = useState(false);
  const [logId,        setLogId]        = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("");
  const [error, setError] = useState("");

  // Schedule form
  const [sForm, setSForm] = useState({ title: "", topic: "BOOK_USAGE", schoolId: "", scheduledDate: "" });
  const [sSaving, setSSaving] = useState(false);

  // Log form
  const [lForm, setLForm] = useState<any>({
    status: "COMPLETED",
    completedDate: "",
    teachersAttended: "",
    durationMinutes: "",
    overallNotes: "",
    teacherFeedback: "",
    followUpRequired: false,
    followUpNotes: "",
  });
  const [lSaving, setLSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/content/training-sessions", { credentials: "include" }).then((r) => r.json()),
      fetch("/api/bd/schools",                { credentials: "include" }).then((r) => r.json()),
    ]).then(([s, sc]) => {
      setSessions(Array.isArray(s) ? s : []);
      const schoolsList = Array.isArray(sc) ? sc : (sc.schools ?? []);
      setSchools(schoolsList);
    }).finally(() => setLoading(false));
  }, []);

  async function scheduleSession() {
    if (!sForm.title || !sForm.schoolId || !sForm.scheduledDate) { setError("Title, school, and date are required"); return; }
    setSSaving(true);
    setError("");
    try {
      const res = await fetch("/api/content/training-sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(sForm),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Failed"); return; }
      setSessions((prev) => [data, ...prev]);
      setShowSchedule(false);
      setSForm({ title: "", topic: "BOOK_USAGE", schoolId: "", scheduledDate: "" });
    } finally {
      setSSaving(false);
    }
  }

  function openLog(session: any) {
    setLogId(session.id);
    setLForm({
      status: "COMPLETED",
      completedDate: new Date().toISOString().slice(0, 16),
      teachersAttended: session.teachersAttended ?? "",
      durationMinutes: session.durationMinutes ?? "",
      overallNotes: session.overallNotes ?? "",
      teacherFeedback: session.teacherFeedback ?? "",
      followUpRequired: session.followUpRequired ?? false,
      followUpNotes: session.followUpNotes ?? "",
    });
  }

  async function saveLog() {
    if (!logId) return;
    setLSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/content/training-sessions?id=${logId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          ...lForm,
          teachersAttended: lForm.teachersAttended ? Number(lForm.teachersAttended) : undefined,
          durationMinutes:  lForm.durationMinutes  ? Number(lForm.durationMinutes)  : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Failed"); return; }
      setSessions((prev) => prev.map((s) => (s.id === logId ? data : s)));
      setLogId(null);
    } finally {
      setLSaving(false);
    }
  }

  const filteredSessions = statusFilter ? sessions.filter((s) => s.status === statusFilter) : sessions;

  if (loading) return <div style={{ color: "var(--text-muted)", padding: "40px 0", textAlign: "center" }}>Loading...</div>;

  return (
    <>
      <div className="page-header">
        <h1>Training Sessions</h1>
        <p>Schedule and log teacher training sessions.</p>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 16, alignItems: "center" }}>
        <button className="btn btn-primary" onClick={() => { setShowSchedule(true); setError(""); }}>+ Schedule Training</button>
        <select className="input" style={{ width: "auto" }} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">All Statuses</option>
          <option value="SCHEDULED">Scheduled</option>
          <option value="COMPLETED">Completed</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
      </div>

      {error && !showSchedule && !logId && (
        <p style={{ color: "var(--red)", fontSize: 13, marginBottom: 12 }}>{error}</p>
      )}

      {/* Schedule Modal */}
      {showSchedule && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div className="card" style={{ width: "100%", maxWidth: 480 }}>
            <h2 style={{ margin: "0 0 16px" }}>Schedule Training Session</h2>
            {error && <p style={{ color: "var(--red)", fontSize: 13, marginBottom: 10 }}>{error}</p>}
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <label className="form-label">Title *</label>
                <input className="input" value={sForm.title} onChange={(e) => setSForm((p) => ({ ...p, title: e.target.value }))} placeholder="e.g. Book Usage Training - GKS" />
              </div>
              <div>
                <label className="form-label">Topic *</label>
                <select className="input" value={sForm.topic} onChange={(e) => setSForm((p) => ({ ...p, topic: e.target.value }))}>
                  <option value="BOOK_USAGE">Book Usage</option>
                  <option value="QUIZ_METHODOLOGY">Quiz Methodology</option>
                  <option value="BOTH">Both</option>
                </select>
              </div>
              <div>
                <label className="form-label">School *</label>
                <select className="input" value={sForm.schoolId} onChange={(e) => setSForm((p) => ({ ...p, schoolId: e.target.value }))}>
                  <option value="">Select school...</option>
                  {schools.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label className="form-label">Scheduled Date *</label>
                <input className="input" type="datetime-local" value={sForm.scheduledDate} onChange={(e) => setSForm((p) => ({ ...p, scheduledDate: e.target.value }))} />
              </div>
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                <button className="btn btn-ghost" onClick={() => setShowSchedule(false)}>Cancel</button>
                <button className="btn btn-primary" onClick={scheduleSession} disabled={sSaving}>{sSaving ? "Scheduling..." : "Schedule"}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Log Outcome Modal */}
      {logId && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div className="card" style={{ width: "100%", maxWidth: 520, maxHeight: "90vh", overflowY: "auto" }}>
            <h2 style={{ margin: "0 0 16px" }}>Log Training Outcome</h2>
            {error && <p style={{ color: "var(--red)", fontSize: 13, marginBottom: 10 }}>{error}</p>}
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div>
                  <label className="form-label">Status</label>
                  <select className="input" value={lForm.status} onChange={(e) => setLForm((p: any) => ({ ...p, status: e.target.value }))}>
                    <option value="COMPLETED">Completed</option>
                    <option value="CANCELLED">Cancelled</option>
                  </select>
                </div>
                <div>
                  <label className="form-label">Completed Date</label>
                  <input className="input" type="datetime-local" value={lForm.completedDate} onChange={(e) => setLForm((p: any) => ({ ...p, completedDate: e.target.value }))} />
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div>
                  <label className="form-label">Teachers Attended</label>
                  <input className="input" type="number" value={lForm.teachersAttended} onChange={(e) => setLForm((p: any) => ({ ...p, teachersAttended: e.target.value }))} />
                </div>
                <div>
                  <label className="form-label">Duration (minutes)</label>
                  <input className="input" type="number" value={lForm.durationMinutes} onChange={(e) => setLForm((p: any) => ({ ...p, durationMinutes: e.target.value }))} />
                </div>
              </div>
              <div>
                <label className="form-label">Overall Notes</label>
                <textarea className="input" value={lForm.overallNotes} onChange={(e) => setLForm((p: any) => ({ ...p, overallNotes: e.target.value }))} style={{ height: 72, resize: "vertical" }} />
              </div>
              <div>
                <label className="form-label">Teacher Feedback</label>
                <textarea className="input" value={lForm.teacherFeedback} onChange={(e) => setLForm((p: any) => ({ ...p, teacherFeedback: e.target.value }))} style={{ height: 72, resize: "vertical" }} />
              </div>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <input type="checkbox" id="fur" checked={lForm.followUpRequired} onChange={(e) => setLForm((p: any) => ({ ...p, followUpRequired: e.target.checked }))} />
                  <label htmlFor="fur" style={{ fontSize: 14 }}>Follow-up Required</label>
                </div>
                {lForm.followUpRequired && (
                  <textarea className="input" placeholder="Follow-up notes..." value={lForm.followUpNotes} onChange={(e) => setLForm((p: any) => ({ ...p, followUpNotes: e.target.value }))} style={{ height: 56, resize: "vertical" }} />
                )}
              </div>
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                <button className="btn btn-ghost" onClick={() => setLogId(null)}>Cancel</button>
                <button className="btn btn-primary" onClick={saveLog} disabled={lSaving}>{lSaving ? "Saving..." : "Save Outcome"}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sessions table */}
      {filteredSessions.length === 0 ? (
        <div className="empty-state"><p>No training sessions found</p></div>
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Topic</th>
                <th>School</th>
                <th>Date</th>
                <th>Status</th>
                <th>Teachers</th>
                <th>Follow-up</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredSessions.map((s) => (
                <tr key={s.id}>
                  <td style={{ fontWeight: 500 }}>{s.title}</td>
                  <td><span className="badge badge-indigo" style={{ fontSize: 11 }}>{TOPIC_LABELS[s.topic] ?? s.topic}</span></td>
                  <td>{s.school?.name ?? "—"}</td>
                  <td style={{ fontSize: 13, color: "var(--text-muted)" }}>{new Date(s.scheduledDate).toLocaleDateString("en-IN")}</td>
                  <td><span className={`badge ${STATUS_BADGE[s.status] ?? "badge-gray"}`}>{s.status}</span></td>
                  <td>{s.teachersAttended ?? "—"}</td>
                  <td>
                    {s.followUpRequired ? (
                      <span className="badge badge-yellow" style={{ fontSize: 11 }}>Required</span>
                    ) : (
                      <span style={{ color: "var(--text-muted)", fontSize: 12 }}>—</span>
                    )}
                  </td>
                  <td>
                    {s.status !== "CANCELLED" && (
                      <button className="btn btn-ghost" style={{ fontSize: 12, padding: "3px 8px" }} onClick={() => openLog(s)}>
                        Log Outcome
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
