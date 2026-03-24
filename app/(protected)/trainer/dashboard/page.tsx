"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const STATUS_BADGE: Record<string, string> = {
  SCHEDULED:   "badge-blue",
  IN_PROGRESS: "badge-yellow",
  COMPLETED:   "badge-green",
  CANCELLED:   "badge-red",
};

export default function TrainerDashboardPage() {
  const [user,      setUser]      = useState<any>(null);
  const [trainings, setTrainings] = useState<any[]>([]);
  const [quizzes,   setQuizzes]   = useState<any[]>([]);
  const [events,    setEvents]    = useState<any[]>([]);
  const [loading,   setLoading]   = useState(true);

  useEffect(() => {
    const from = new Date(); from.setHours(0, 0, 0, 0);
    const to   = new Date(from.getFullYear(), from.getMonth() + 2, 0);

    Promise.all([
      fetch("/api/auth/me",                    { credentials: "include" }).then((r) => r.json()),
      fetch("/api/content/training-sessions",  { credentials: "include" }).then((r) => r.json()),
      fetch("/api/content/quiz-sessions",      { credentials: "include" }).then((r) => r.json()),
      fetch(`/api/events?from=${from.toISOString()}&to=${to.toISOString()}`, { credentials: "include" }).then((r) => r.json()),
    ])
      .then(([me, t, q, ev]) => {
        setUser(me?.user ?? null);
        setTrainings(Array.isArray(t) ? t : []);
        setQuizzes(Array.isArray(q) ? q : []);
        setEvents(Array.isArray(ev) ? ev : []);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p style={{ color: "var(--text-muted)" }}>Loading...</p>;

  const upcomingTrainings = trainings.filter((s) => s.status === "SCHEDULED").slice(0, 5);
  const upcomingQuizzes   = quizzes.filter((s) => s.status === "SCHEDULED").slice(0, 5);
  const completedTrainings = trainings.filter((s) => s.status === "COMPLETED").length;
  const completedQuizzes   = quizzes.filter((s) => s.status === "COMPLETED").length;
  const upcomingEvents     = events.filter((e) => new Date(e.date) >= new Date()).slice(0, 5);

  return (
    <>
      <div className="page-header">
        <h1>Trainer Dashboard</h1>
        <p>Welcome back{user?.name ? `, ${user.name}` : ""}. Your sessions and schedule at a glance.</p>
      </div>

      {/* Stats */}
      <div className="stats-grid" style={{ marginBottom: 24 }}>
        <div className="stat-card">
          <div className="stat-label">Training Sessions</div>
          <div className="stat-value">{trainings.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Quiz Sessions</div>
          <div className="stat-value">{quizzes.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Completed Trainings</div>
          <div className="stat-value" style={{ color: "var(--green)" }}>{completedTrainings}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Completed Quizzes</div>
          <div className="stat-value" style={{ color: "var(--green)" }}>{completedQuizzes}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Upcoming Events</div>
          <div className="stat-value" style={{ color: "var(--accent)" }}>{upcomingEvents.length}</div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>

        {/* Upcoming Training Sessions */}
        <div className="card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h2>Upcoming Trainings</h2>
            <Link href="/content/training-sessions" className="btn btn-ghost" style={{ fontSize: 13 }}>View All</Link>
          </div>
          {upcomingTrainings.length === 0 ? (
            <div className="empty-state"><p>No upcoming training sessions</p></div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
              {upcomingTrainings.map((s, i) => (
                <div key={s.id} style={{
                  padding: "10px 0",
                  borderBottom: i < upcomingTrainings.length - 1 ? "1px solid var(--border-soft)" : "none",
                }}>
                  <div style={{ fontWeight: 500, fontSize: 13.5 }}>{s.title}</div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
                    {s.school?.name ?? "—"}
                    {" · "}
                    {new Date(s.scheduledDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                  </div>
                  {s.topic && (
                    <div style={{ fontSize: 11.5, color: "var(--accent)", marginTop: 2 }}>{s.topic}</div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Upcoming Quiz Sessions */}
        <div className="card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h2>Upcoming Quizzes</h2>
            <Link href="/content/quiz-sessions" className="btn btn-ghost" style={{ fontSize: 13 }}>View All</Link>
          </div>
          {upcomingQuizzes.length === 0 ? (
            <div className="empty-state"><p>No upcoming quiz sessions</p></div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
              {upcomingQuizzes.map((s, i) => (
                <div key={s.id} style={{
                  padding: "10px 0",
                  borderBottom: i < upcomingQuizzes.length - 1 ? "1px solid var(--border-soft)" : "none",
                }}>
                  <div style={{ fontWeight: 500, fontSize: 13.5 }}>{s.title}</div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
                    {s.school?.name ?? "—"}
                    {" · "}
                    {new Date(s.scheduledDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                  </div>
                  <span className={`badge ${STATUS_BADGE[s.status] ?? "badge-gray"}`} style={{ fontSize: 11, marginTop: 4 }}>
                    {s.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* Event Schedule */}
      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h2>Event Schedule</h2>
          <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Next 2 months</span>
        </div>
        {upcomingEvents.length === 0 ? (
          <div className="empty-state"><p>No scheduled events</p></div>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>School</th>
                  <th>Type</th>
                  <th>Date</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                {upcomingEvents.map((ev) => (
                  <tr key={ev.id}>
                    <td style={{ fontWeight: 500 }}>{ev.school?.name ?? "—"}</td>
                    <td>
                      <span className={`badge ${ev.type === "QUIZ" ? "badge-indigo" : ev.type === "TEACHER_TRAINING" ? "badge-green" : "badge-blue"}`}>
                        {ev.type === "TEACHER_TRAINING" ? "Training" : ev.type === "QUIZ" ? "Quiz" : "Meeting"}
                      </span>
                    </td>
                    <td style={{ color: "var(--text-muted)", fontSize: 12.5 }}>
                      {new Date(ev.date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                    </td>
                    <td style={{ color: "var(--text-muted)", fontSize: 12.5 }}>{ev.notes ?? "—"}</td>
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
