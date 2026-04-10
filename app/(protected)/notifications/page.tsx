"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

function formatTime(date: Date): string {
  const now  = new Date();
  const diff = now.getTime() - date.getTime();
  const hours = diff / 3600000;
  if (hours < 1) return `${Math.floor(diff / 60000)}m ago`;
  if (hours < 24) return `${Math.floor(hours)}h ago`;
  if (hours < 48) return `Yesterday ${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}

function groupByDay(notifications: any[]) {
  const today     = new Date(); today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);
  const groups: { label: string; items: any[] }[] = [];

  for (const n of notifications) {
    const d = new Date(n.createdAt); d.setHours(0, 0, 0, 0);
    let label: string;
    if (d.getTime() === today.getTime())     label = "Today";
    else if (d.getTime() === yesterday.getTime()) label = "Yesterday";
    else label = new Date(n.createdAt).toLocaleDateString([], { weekday: "long", month: "short", day: "numeric" });

    const existing = groups.find((g) => g.label === label);
    if (existing) existing.items.push(n);
    else groups.push({ label, items: [n] });
  }

  return groups;
}

const TYPE_ICONS: Record<string, { char: string; bg: string; color: string }> = {
  APPROVED:      { char: "✓", bg: "color-mix(in srgb, var(--green)  18%, transparent)", color: "var(--green)"  },
  REJECTED:      { char: "✕", bg: "color-mix(in srgb, var(--red)    18%, transparent)", color: "var(--red)"   },
  TASK_ASSIGNED: { char: "★", bg: "color-mix(in srgb, var(--accent) 18%, transparent)", color: "var(--accent)" },
  OVERDUE_TASK:  { char: "⚠", bg: "color-mix(in srgb, var(--yellow) 22%, transparent)", color: "var(--yellow)" },
};

function TypeIcon({ type }: { type: string }) {
  const cfg = TYPE_ICONS[type] ?? { char: "·", bg: "var(--border)", color: "var(--text-muted)" };
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", justifyContent: "center",
      width: 32, height: 32, borderRadius: "50%",
      background: cfg.bg, color: cfg.color,
      fontSize: 14, fontWeight: 700, flexShrink: 0,
    }}>
      {cfg.char}
    </span>
  );
}

export default function NotificationsPage() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = async () => {
    const res  = await fetch("/api/notifications", { credentials: "include" });
    const data = await res.json();
    setNotifications(Array.isArray(data) ? data : []);
  };

  useEffect(() => {
    fetchNotifications().finally(() => setLoading(false));
  }, []);

  const markRead = async (id: string) => {
    await fetch("/api/notifications/mark-read", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ ids: [id] }),
    });
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
  };

  const markAllRead = async () => {
    await fetch("/api/notifications/mark-read", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ all: true }),
    });
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  };

  const handleClick = async (n: any) => {
    if (!n.isRead) await markRead(n.id);
    if (n.entityType === "Order" && n.entityId) {
      router.push(`/orders/${n.entityId}`);
    }
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;
  const groups      = groupByDay(notifications);

  return (
    <>
      <div className="page-header">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", width: "100%" }}>
          <div>
            <h1>Notifications</h1>
            <p>Stay updated on approvals, rejections, and tasks</p>
          </div>
          {unreadCount > 0 && (
            <button className="btn btn-secondary" onClick={markAllRead} style={{ flexShrink: 0 }}>
              Mark all as read
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div style={{ color: "var(--text-muted)", padding: "40px 0", textAlign: "center" }}>Loading...</div>
      ) : notifications.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: "48px 24px" }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>✓</div>
          <p style={{ fontSize: 16, fontWeight: 600, marginBottom: 6, color: "var(--text-primary)" }}>
            You&rsquo;re all caught up!
          </p>
          <p style={{ fontSize: 13, color: "var(--text-muted)" }}>
            No notifications yet. Check back later.
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {groups.map((group) => (
            <div key={group.label}>
              {/* Day label */}
              <p style={{
                fontSize: 11, fontWeight: 700, color: "var(--text-muted)",
                textTransform: "uppercase", letterSpacing: "0.07em",
                marginBottom: 8,
              }}>
                {group.label}
              </p>

              <div className="card" style={{ padding: 0, overflow: "hidden" }}>
                {group.items.map((n, i) => (
                  <div
                    key={n.id}
                    onClick={() => handleClick(n)}
                    style={{
                      display: "flex", alignItems: "flex-start", gap: 12,
                      padding: "13px 16px",
                      cursor: (n.entityType === "Order" && n.entityId) || !n.isRead ? "pointer" : "default",
                      background: n.isRead ? "transparent" : "color-mix(in srgb, var(--accent) 5%, transparent)",
                      borderBottom: i < group.items.length - 1 ? "1px solid var(--border-soft)" : "none",
                      transition: "background 0.15s",
                    }}
                  >
                    {/* Type icon */}
                    <TypeIcon type={n.type} />

                    {/* Content */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{
                        margin: "0 0 2px", fontSize: 13.5,
                        fontWeight: n.isRead ? 400 : 600,
                        color: "var(--text-primary)",
                      }}>
                        {n.title}
                      </p>
                      <p style={{ margin: "0 0 3px", fontSize: 12.5, color: "var(--text-secondary)", lineHeight: 1.4 }}>
                        {n.message}
                      </p>
                      <p style={{ margin: 0, fontSize: 11.5, color: "var(--text-muted)" }}>
                        {formatTime(new Date(n.createdAt))}
                      </p>
                    </div>

                    {/* Unread indicator */}
                    {!n.isRead && (
                      <span style={{
                        width: 8, height: 8, borderRadius: "50%",
                        background: "var(--accent)", flexShrink: 0,
                        marginTop: 6,
                      }} />
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
