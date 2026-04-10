"use client";

import { useEffect, useState } from "react";

const TYPE_STYLES: Record<string, { bg: string; color: string; border: string; dot: string }> = {
  REPORT: { bg: "var(--blue-bg)",   color: "var(--blue)",   border: "var(--blue-border)",   dot: "#2563eb" },
  ORDER:  { bg: "var(--green-bg)",  color: "var(--green)",  border: "var(--green-border)",  dot: "#16a34a" },
  TASK:   { bg: "var(--accent-soft)", color: "var(--accent)", border: "var(--accent-border)", dot: "#6366f1" },
};

export default function BDTimelinePage() {
  const [timeline, setTimeline] = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);
  const [filter, setFilter]     = useState("ALL");

  useEffect(() => {
    fetch("/api/bd/analytics", { credentials: "include" })
      .then((r) => r.json())
      .then((data) => {
        setTimeline(Array.isArray(data.timeline) ? data.timeline : []);
        setLoading(false);
      });
  }, []);

  const filtered = timeline.filter(
    (item) => filter === "ALL" || item.type === filter
  );

  // Group by date
  const grouped: Record<string, any[]> = {};
  filtered.forEach((item) => {
    const day = new Date(item.time).toLocaleDateString("en-IN", {
      weekday: "long", year: "numeric", month: "long", day: "numeric",
    });
    if (!grouped[day]) grouped[day] = [];
    grouped[day].push(item);
  });

  return (
    <>
      <div className="page-header">
        <h1>Activity Timeline</h1>
        <p>A chronological log of all team activity</p>
      </div>

      {/* ── Filter ── */}
      <div style={{ display: "flex", gap: 6, marginBottom: 24 }}>
        {["ALL", "REPORT", "ORDER", "TASK"].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              padding: "5px 14px", borderRadius: 99, fontSize: 12.5, fontWeight: 500,
              border: "1px solid var(--border)", cursor: "pointer", fontFamily: "inherit",
              background: filter === f ? "var(--accent)" : "var(--surface)",
              color: filter === f ? "#fff" : "var(--text-secondary)",
              transition: "all 0.15s",
            }}
          >
            {f}
          </button>
        ))}
        <span style={{ marginLeft: "auto", color: "var(--text-muted)", fontSize: 13, alignSelf: "center" }}>
          {filtered.length} event{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>

      {loading ? (
        <div style={{ color: "var(--text-muted)", padding: "40px 0", textAlign: "center" }}>Loading...</div>
      ) : filtered.length === 0 ? (
        <div className="empty-state card">
          <p>No activity yet</p>
          <p>Events from your team will appear here</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
          {Object.entries(grouped).map(([day, items]) => (
            <div key={day}>
              {/* Day header */}
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                <span style={{
                  fontSize: 12, fontWeight: 600, color: "var(--text-muted)",
                  textTransform: "uppercase", letterSpacing: "0.06em", whiteSpace: "nowrap",
                }}>
                  {day}
                </span>
                <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
              </div>

              {/* Events */}
              <div style={{ display: "flex", flexDirection: "column", gap: 0, position: "relative" }}>
                {/* Vertical line */}
                <div style={{
                  position: "absolute", left: 7, top: 8, bottom: 8,
                  width: 1, background: "var(--border)",
                }} />

                {items.map((item, i) => {
                  const style = TYPE_STYLES[item.type] ?? TYPE_STYLES.TASK;
                  return (
                    <div
                      key={i}
                      className="fade-in"
                      style={{
                        display: "flex", gap: 16, paddingBottom: 14,
                        position: "relative",
                      }}
                    >
                      {/* Dot */}
                      <div style={{
                        width: 15, height: 15, borderRadius: "50%",
                        background: style.dot, border: "2px solid var(--surface)",
                        flexShrink: 0, marginTop: 2, zIndex: 1,
                        boxShadow: `0 0 0 3px ${style.bg}`,
                      }} />

                      {/* Content */}
                      <div style={{
                        flex: 1, background: "var(--surface)",
                        border: "1px solid var(--border)",
                        borderRadius: "var(--radius-lg)", padding: "12px 14px",
                        boxShadow: "var(--shadow-sm)",
                      }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                          <span style={{
                            fontSize: 11, fontWeight: 700, textTransform: "uppercase",
                            letterSpacing: "0.06em", color: style.color,
                          }}>
                            {item.type}
                          </span>
                          <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
                            {new Date(item.time).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>
                        <p style={{ margin: 0, fontSize: 13.5 }}>
                          <span style={{ fontWeight: 600 }}>{item.user}</span>
                          {" — "}
                          {item.description}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
