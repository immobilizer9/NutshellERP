"use client";

import { useState } from "react";

export const EVENT_COLORS: Record<string, string> = {
  QUIZ:             "#6366f1",
  TEACHER_TRAINING: "#22c55e",
  MEETING:          "#3b82f6",
};

export const EVENT_LABELS: Record<string, string> = {
  QUIZ:             "Quiz",
  TEACHER_TRAINING: "Teacher Training",
  MEETING:          "Meeting",
};

export function EventCalendar({ events }: { events: any[] }) {
  const [month, setMonth] = useState(() => {
    const d = new Date(); d.setDate(1); return d;
  });

  const year  = month.getFullYear();
  const mon   = month.getMonth();
  const first = new Date(year, mon, 1).getDay();
  const days  = new Date(year, mon + 1, 0).getDate();

  const eventsByDay: Record<number, any[]> = {};
  events.forEach((ev) => {
    const d = new Date(ev.date);
    if (d.getFullYear() === year && d.getMonth() === mon) {
      const day = d.getDate();
      if (!eventsByDay[day]) eventsByDay[day] = [];
      eventsByDay[day].push(ev);
    }
  });

  const cells = Array.from({ length: first + days }, (_, i) =>
    i < first ? null : i - first + 1
  );

  const today = new Date();

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <button className="btn btn-ghost" onClick={() => setMonth(new Date(year, mon - 1, 1))} style={{ padding: "4px 8px" }}>‹</button>
        <span style={{ fontWeight: 600, fontSize: 14 }}>
          {month.toLocaleDateString("en-IN", { month: "long", year: "numeric" })}
        </span>
        <button className="btn btn-ghost" onClick={() => setMonth(new Date(year, mon + 1, 1))} style={{ padding: "4px 8px" }}>›</button>
      </div>

      {/* Day labels */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2, marginBottom: 4 }}>
        {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => (
          <div key={d} style={{ textAlign: "center", fontSize: 11, color: "var(--text-muted)", fontWeight: 600, padding: "2px 0" }}>{d}</div>
        ))}
      </div>

      {/* Days grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2 }}>
        {cells.map((day, i) => {
          if (!day) return <div key={`e${i}`} />;
          const isToday = today.getDate() === day && today.getMonth() === mon && today.getFullYear() === year;
          const dayEvents = eventsByDay[day] ?? [];
          return (
            <div
              key={day}
              title={dayEvents.map((e) => `${EVENT_LABELS[e.type]}: ${e.school?.name}`).join("\n")}
              style={{
                borderRadius: "var(--radius)",
                padding: "4px 2px",
                minHeight: 36,
                background: isToday ? "var(--accent-soft)" : dayEvents.length ? "var(--bg-subtle, var(--bg))" : "transparent",
                border: isToday ? "1px solid var(--accent)" : "1px solid transparent",
                cursor: dayEvents.length ? "pointer" : "default",
              }}
            >
              <div style={{ textAlign: "center", fontSize: 12, fontWeight: isToday ? 700 : 400, color: isToday ? "var(--accent)" : "var(--text-secondary)" }}>{day}</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 2, justifyContent: "center", marginTop: 2 }}>
                {dayEvents.slice(0, 3).map((ev, j) => (
                  <div key={j} style={{ width: 6, height: 6, borderRadius: "50%", background: EVENT_COLORS[ev.type] ?? "var(--accent)" }} />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div style={{ display: "flex", gap: 14, marginTop: 12, flexWrap: "wrap" }}>
        {Object.entries(EVENT_LABELS).map(([k, label]) => (
          <div key={k} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "var(--text-muted)" }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: EVENT_COLORS[k] }} />
            {label}
          </div>
        ))}
      </div>
    </div>
  );
}

export function UpcomingEvents({ events }: { events: any[] }) {
  const upcoming = events.filter((e) => new Date(e.date) >= new Date()).slice(0, 10);

  if (upcoming.length === 0) {
    return (
      <div className="empty-state">
        <p>No events scheduled</p>
        <p>Schedule quizzes or teacher training from the Pipeline page</p>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
      {upcoming.map((ev, i) => {
        const d = new Date(ev.date);
        return (
          <div key={ev.id} style={{
            display: "flex", alignItems: "flex-start", gap: 12, padding: "10px 0",
            borderBottom: i < upcoming.length - 1 ? "1px solid var(--border-soft)" : "none",
          }}>
            <div style={{ textAlign: "center", minWidth: 38, background: "var(--bg)", borderRadius: "var(--radius)", padding: "4px 6px", border: "1px solid var(--border)", flexShrink: 0 }}>
              <div style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                {d.toLocaleDateString("en-IN", { month: "short" })}
              </div>
              <div style={{ fontSize: 18, fontWeight: 700, lineHeight: 1.1 }}>{d.getDate()}</div>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ marginBottom: 2 }}>
                <span style={{
                  fontSize: 11, fontWeight: 600, padding: "2px 7px", borderRadius: 99,
                  background: `${EVENT_COLORS[ev.type]}22`,
                  color: EVENT_COLORS[ev.type],
                }}>
                  {EVENT_LABELS[ev.type] ?? ev.type}
                </span>
              </div>
              <p style={{ margin: 0, fontWeight: 500, fontSize: 13.5 }}>{ev.school?.name ?? "—"}</p>
              {ev.createdBy && <p style={{ margin: "1px 0 0", fontSize: 12, color: "var(--text-muted)" }}>{ev.createdBy.name}</p>}
              {ev.notes && <p style={{ margin: "1px 0 0", fontSize: 12, color: "var(--text-muted)" }}>{ev.notes}</p>}
              <p style={{ margin: "2px 0 0", fontSize: 12, color: "var(--text-muted)" }}>
                {d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
