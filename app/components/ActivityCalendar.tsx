"use client";

import { useEffect, useState } from "react";

type Activity = {
  id: string;
  type: string;
  status: string;
  scheduledDate: string;
  completedDate?: string | null;
  notes?: string | null;
  location?: string | null;
  school: { id: string; name: string };
  user: { id: string; name: string };
};

type Props = {
  userRole: string;
  currentUserId: string;
  salesTeam: { id: string; name: string }[];
};

const TYPE_COLORS: Record<string, string> = {
  VISIT:            "#6366f1",  // indigo
  QUIZ:             "#f59e0b",  // amber
  TEACHER_TRAINING: "#22c55e",  // green
};

const TYPE_LABELS: Record<string, string> = {
  VISIT:            "Visit",
  QUIZ:             "Quiz",
  TEACHER_TRAINING: "Teacher Training",
};

const STATUS_BADGE: Record<string, string> = {
  SCHEDULED:  "badge-yellow",
  COMPLETED:  "badge-green",
  CANCELLED:  "badge-red",
};

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function getMonthGrid(year: number, month: number): (number | null)[] {
  // month is 1-based
  const firstDay = new Date(year, month - 1, 1).getDay(); // 0=Sun
  const daysInMonth = new Date(year, month, 0).getDate();
  // Convert Sunday=0 to Mon-based: Mon=0...Sun=6
  const startOffset = (firstDay + 6) % 7;
  const cells: (number | null)[] = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  // Pad to complete last week
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

export default function ActivityCalendar({ userRole, currentUserId, salesTeam }: Props) {
  const now = new Date();
  const [currentYear,  setCurrentYear]  = useState(now.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(now.getMonth() + 1);
  const [activities,   setActivities]   = useState<Activity[]>([]);
  const [selectedDay,  setSelectedDay]  = useState<number | null>(null);
  const [schools,      setSchools]      = useState<any[]>([]);
  const [showSchedule, setShowSchedule] = useState(false);
  const [updating,     setUpdating]     = useState<string | null>(null);
  const [error, setError] = useState("");

  // Schedule form
  const [sForm, setSForm] = useState({
    type: "VISIT",
    schoolId: "",
    userId: currentUserId,
    scheduledDate: "",
    notes: "",
    location: "",
  });
  const [sSaving, setSSaving] = useState(false);

  function fetchActivities(year: number, month: number) {
    fetch(`/api/activities?year=${year}&month=${month}`, { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setActivities(Array.isArray(d) ? d : []));
  }

  useEffect(() => {
    fetchActivities(currentYear, currentMonth);
    fetch("/api/bd/schools", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => {
        const list = Array.isArray(d) ? d : (d.schools ?? []);
        setSchools(list);
      });
  }, []);

  useEffect(() => {
    fetchActivities(currentYear, currentMonth);
  }, [currentYear, currentMonth]);

  function prevMonth() {
    if (currentMonth === 1) { setCurrentYear((y) => y - 1); setCurrentMonth(12); }
    else setCurrentMonth((m) => m - 1);
  }
  function nextMonth() {
    if (currentMonth === 12) { setCurrentYear((y) => y + 1); setCurrentMonth(1); }
    else setCurrentMonth((m) => m + 1);
  }

  function getActivitiesForDay(day: number): Activity[] {
    return activities.filter((a) => {
      const d = new Date(a.scheduledDate);
      return d.getFullYear() === currentYear && d.getMonth() + 1 === currentMonth && d.getDate() === day;
    });
  }

  async function markComplete(id: string) {
    setUpdating(id);
    const res = await fetch(`/api/activities?id=${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ status: "COMPLETED", completedDate: new Date().toISOString() }),
    });
    if (res.ok) {
      const data = await res.json();
      setActivities((prev) => prev.map((a) => (a.id === id ? data : a)));
    }
    setUpdating(null);
  }

  async function cancelActivity(id: string) {
    setUpdating(id);
    const res = await fetch(`/api/activities?id=${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ status: "CANCELLED" }),
    });
    if (res.ok) {
      const data = await res.json();
      setActivities((prev) => prev.map((a) => (a.id === id ? data : a)));
    }
    setUpdating(null);
  }

  async function scheduleActivity() {
    if (!sForm.schoolId || !sForm.scheduledDate) { setError("School and date are required"); return; }
    setSSaving(true);
    setError("");
    try {
      const res = await fetch("/api/activities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(sForm),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Failed"); return; }
      const d = new Date(data.scheduledDate);
      if (d.getFullYear() === currentYear && d.getMonth() + 1 === currentMonth) {
        setActivities((prev) => [...prev, data]);
      }
      setShowSchedule(false);
      setSForm({ type: "VISIT", schoolId: "", userId: currentUserId, scheduledDate: "", notes: "", location: "" });
    } finally {
      setSSaving(false);
    }
  }

  const cells = getMonthGrid(currentYear, currentMonth);
  const todayDay = now.getFullYear() === currentYear && now.getMonth() + 1 === currentMonth ? now.getDate() : null;
  const monthName = new Date(currentYear, currentMonth - 1, 1).toLocaleDateString("en-IN", { month: "long", year: "numeric" });

  const selectedActivities = selectedDay ? getActivitiesForDay(selectedDay) : [];

  const isBDHead = userRole === "BD_HEAD";

  return (
    <div>
      {/* Calendar header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button onClick={prevMonth} className="btn btn-ghost" style={{ padding: "4px 10px" }}>‹</button>
          <span style={{ fontWeight: 700, fontSize: 16 }}>{monthName}</span>
          <button onClick={nextMonth} className="btn btn-ghost" style={{ padding: "4px 10px" }}>›</button>
        </div>
        <button className="btn btn-primary" onClick={() => { setShowSchedule(true); setError(""); }}>+ Schedule Activity</button>
      </div>

      {/* Legend */}
      <div style={{ display: "flex", gap: 16, marginBottom: 12, fontSize: 12 }}>
        {Object.entries(TYPE_COLORS).map(([type, color]) => (
          <div key={type} style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <div style={{ width: 10, height: 10, borderRadius: "50%", background: color }} />
            <span style={{ color: "var(--text-muted)" }}>{TYPE_LABELS[type]}</span>
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2, marginBottom: 20 }}>
        {/* Weekday headers */}
        {WEEKDAYS.map((d) => (
          <div key={d} style={{ textAlign: "center", fontSize: 11, fontWeight: 700, color: "var(--text-muted)", padding: "4px 0", textTransform: "uppercase", letterSpacing: "0.04em" }}>
            {d}
          </div>
        ))}
        {/* Day cells */}
        {cells.map((day, idx) => {
          if (day === null) {
            return <div key={`empty-${idx}`} style={{ height: 64, background: "var(--bg)", borderRadius: "var(--radius)", opacity: 0.3 }} />;
          }
          const dayActivities = getActivitiesForDay(day);
          const isToday = day === todayDay;
          const isSelected = day === selectedDay;
          return (
            <div
              key={day}
              onClick={() => setSelectedDay(selectedDay === day ? null : day)}
              style={{
                height: 64,
                padding: "4px 6px",
                background: "var(--surface)",
                border: isToday ? "2px solid var(--accent)" : isSelected ? "2px solid var(--text-muted)" : "1px solid var(--border)",
                borderRadius: "var(--radius)",
                cursor: "pointer",
                transition: "border 0.1s",
                overflow: "hidden",
              }}
            >
              <div style={{ fontSize: 11, fontWeight: isToday ? 700 : 400, color: isToday ? "var(--accent)" : "var(--text-primary)", marginBottom: 4 }}>
                {day}
              </div>
              <div style={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
                {dayActivities.slice(0, 4).map((a) => (
                  <div
                    key={a.id}
                    title={`${TYPE_LABELS[a.type]} · ${a.school.name}`}
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      background: TYPE_COLORS[a.type] ?? "#9ca3af",
                      opacity: a.status === "CANCELLED" ? 0.3 : 1,
                    }}
                  />
                ))}
                {dayActivities.length > 4 && (
                  <span style={{ fontSize: 9, color: "var(--text-muted)" }}>+{dayActivities.length - 4}</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Day detail panel */}
      {selectedDay && (
        <div className="card" style={{ marginBottom: 20 }}>
          <h3 style={{ margin: "0 0 12px", fontSize: 15 }}>
            {new Date(currentYear, currentMonth - 1, selectedDay).toLocaleDateString("en-IN", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
          </h3>
          {selectedActivities.length === 0 ? (
            <p style={{ color: "var(--text-muted)", fontSize: 13 }}>No activities scheduled for this day.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {selectedActivities.map((a) => (
                <div key={a.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", background: "var(--bg)", borderRadius: "var(--radius)", border: "1px solid var(--border)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 10, height: 10, borderRadius: "50%", background: TYPE_COLORS[a.type] ?? "#9ca3af", flexShrink: 0 }} />
                    <div>
                      <p style={{ fontWeight: 600, margin: 0, fontSize: 13 }}>{TYPE_LABELS[a.type]} · {a.school.name}</p>
                      <p style={{ color: "var(--text-muted)", fontSize: 12, margin: "2px 0 0" }}>
                        {new Date(a.scheduledDate).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                        {a.location ? ` · ${a.location}` : ""}
                        {a.notes ? ` · ${a.notes}` : ""}
                        {isBDHead ? ` · ${a.user.name}` : ""}
                      </p>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    <span className={`badge ${STATUS_BADGE[a.status] ?? "badge-gray"}`} style={{ fontSize: 11 }}>{a.status}</span>
                    {a.status === "SCHEDULED" && (
                      <>
                        <button
                          className="btn btn-success"
                          style={{ fontSize: 11, padding: "2px 8px" }}
                          onClick={() => markComplete(a.id)}
                          disabled={updating === a.id}
                        >
                          Complete
                        </button>
                        <button
                          className="btn btn-danger"
                          style={{ fontSize: 11, padding: "2px 8px" }}
                          onClick={() => cancelActivity(a.id)}
                          disabled={updating === a.id}
                        >
                          Cancel
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Schedule Activity Modal */}
      {showSchedule && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div className="card" style={{ width: "100%", maxWidth: 480 }}>
            <h2 style={{ margin: "0 0 16px" }}>Schedule Activity</h2>
            {error && <p style={{ color: "var(--red)", fontSize: 13, marginBottom: 10 }}>{error}</p>}
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <label className="form-label">Activity Type *</label>
                <select className="input" value={sForm.type} onChange={(e) => setSForm((p) => ({ ...p, type: e.target.value }))}>
                  <option value="VISIT">Visit</option>
                  <option value="QUIZ">Quiz</option>
                  <option value="TEACHER_TRAINING">Teacher Training</option>
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
                <label className="form-label">Date & Time *</label>
                <input className="input" type="datetime-local" value={sForm.scheduledDate} onChange={(e) => setSForm((p) => ({ ...p, scheduledDate: e.target.value }))} />
              </div>
              {isBDHead && salesTeam.length > 0 && (
                <div>
                  <label className="form-label">Assign to</label>
                  <select className="input" value={sForm.userId} onChange={(e) => setSForm((p) => ({ ...p, userId: e.target.value }))}>
                    <option value={currentUserId}>Myself</option>
                    {salesTeam.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                </div>
              )}
              <div>
                <label className="form-label">Location</label>
                <input className="input" placeholder="Optional location..." value={sForm.location} onChange={(e) => setSForm((p) => ({ ...p, location: e.target.value }))} />
              </div>
              <div>
                <label className="form-label">Notes</label>
                <textarea className="input" placeholder="Optional notes..." value={sForm.notes} onChange={(e) => setSForm((p) => ({ ...p, notes: e.target.value }))} style={{ height: 64, resize: "vertical" }} />
              </div>
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                <button className="btn btn-ghost" onClick={() => setShowSchedule(false)}>Cancel</button>
                <button className="btn btn-primary" onClick={scheduleActivity} disabled={sSaving}>{sSaving ? "Scheduling..." : "Schedule"}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
