"use client";

import { useEffect, useState } from "react";

const TYPE_BADGE: Record<string, string> = {
  QUIZ:             "badge-indigo",
  TEACHER_TRAINING: "badge-green",
  MEETING:          "badge-blue",
};

const TYPE_LABEL: Record<string, string> = {
  QUIZ:             "Quiz",
  TEACHER_TRAINING: "Training",
  MEETING:          "Meeting",
};

export default function EventsPage() {
  const [events,    setEvents]    = useState<any[]>([]);
  const [schools,   setSchools]   = useState<any[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [msg,       setMsg]       = useState({ text: "", ok: false });
  const [form, setForm] = useState({ schoolId: "", type: "QUIZ", date: "", notes: "" });

  const fetchEvents = () => {
    const from = new Date(); from.setHours(0, 0, 0, 0);
    const to   = new Date(from.getFullYear(), from.getMonth() + 3, 0);
    return fetch(`/api/events?from=${from.toISOString()}&to=${to.toISOString()}`, { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setEvents(Array.isArray(d) ? d : []));
  };

  useEffect(() => {
    Promise.all([
      fetchEvents(),
      fetch("/api/bd/schools", { credentials: "include" }).then((r) => r.json()).then((d) => setSchools(Array.isArray(d) ? d : [])),
    ]).finally(() => setLoading(false));
  }, []);

  const submit = async () => {
    if (!form.schoolId || !form.date) {
      setMsg({ text: "School and date are required.", ok: false });
      return;
    }
    setSubmitting(true);
    setMsg({ text: "", ok: false });
    const res = await fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (res.ok) {
      setMsg({ text: "Event scheduled.", ok: true });
      setForm({ schoolId: "", type: "QUIZ", date: "", notes: "" });
      fetchEvents();
    } else {
      setMsg({ text: data.error || "Failed to create event.", ok: false });
    }
    setSubmitting(false);
  };

  const deleteEvent = async (id: string) => {
    if (!confirm("Delete this event?")) return;
    await fetch(`/api/events?id=${id}`, { method: "DELETE", credentials: "include" });
    fetchEvents();
  };

  if (loading) return <div style={{ color: "var(--text-muted)", padding: "40px 0", textAlign: "center" }}>Loading...</div>;

  return (
    <>
      <div className="page-header">
        <h1>Event Manager</h1>
        <p>Schedule quizzes, teacher training sessions, and school meetings.</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "340px 1fr", gap: 24, alignItems: "start" }}>

        {/* Create form */}
        <div className="card">
          <h2 style={{ marginBottom: 16 }}>Schedule Event</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

            <div>
              <label className="form-label">School</label>
              <select
                className="input"
                value={form.schoolId}
                onChange={(e) => setForm({ ...form, schoolId: e.target.value })}
              >
                <option value="">Select school…</option>
                {schools.map((s: any) => (
                  <option key={s.id} value={s.id}>{s.name}{s.city ? ` — ${s.city}` : ""}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="form-label">Event Type</label>
              <select
                className="input"
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
              >
                <option value="QUIZ">Quiz</option>
                <option value="TEACHER_TRAINING">Teacher Training</option>
                <option value="MEETING">Meeting</option>
              </select>
            </div>

            <div>
              <label className="form-label">Date</label>
              <input
                type="date"
                className="input"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
              />
            </div>

            <div>
              <label className="form-label">Notes <span style={{ color: "var(--text-muted)" }}>(optional)</span></label>
              <input
                type="text"
                className="input"
                placeholder="Any notes…"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </div>

            {msg.text && (
              <div className={`alert ${msg.ok ? "alert-success" : "alert-error"}`}>{msg.text}</div>
            )}

            <button
              className="btn btn-primary"
              onClick={submit}
              disabled={submitting}
            >
              {submitting ? "Scheduling…" : "Schedule Event"}
            </button>
          </div>
        </div>

        {/* Events list */}
        <div className="card">
          <h2 style={{ marginBottom: 16 }}>Upcoming Events</h2>
          {events.length === 0 ? (
            <div className="empty-state"><p>No events scheduled in the next 3 months.</p></div>
          ) : (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>School</th>
                    <th>Type</th>
                    <th>Date</th>
                    <th>Notes</th>
                    <th>By</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {events.map((ev) => (
                    <tr key={ev.id}>
                      <td style={{ fontWeight: 500 }}>{ev.school?.name ?? "—"}</td>
                      <td>
                        <span className={`badge ${TYPE_BADGE[ev.type] ?? "badge-gray"}`}>
                          {TYPE_LABEL[ev.type] ?? ev.type}
                        </span>
                      </td>
                      <td style={{ color: "var(--text-muted)", fontSize: 12.5 }}>
                        {new Date(ev.date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                      </td>
                      <td style={{ color: "var(--text-muted)", fontSize: 12.5 }}>{ev.notes ?? "—"}</td>
                      <td style={{ color: "var(--text-muted)", fontSize: 12 }}>{ev.createdBy?.name ?? "—"}</td>
                      <td>
                        <button
                          onClick={() => deleteEvent(ev.id)}
                          className="btn btn-ghost"
                          style={{ fontSize: 12, padding: "2px 8px", color: "var(--red)" }}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </>
  );
}
