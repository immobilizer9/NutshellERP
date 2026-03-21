"use client";

import { useEffect, useState } from "react";
import Badge from "@/app/components/Badge";
import { EventCalendar, UpcomingEvents } from "@/app/components/EventCalendar";

export default function AdminDashboard() {
  const [data, setData] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [analyticsError, setAnalyticsError] = useState("");

  const fetchUsers = async () => {
    const res = await fetch("/api/admin/users", { credentials: "include" });
    const result = await res.json();
    if (Array.isArray(result)) setUsers(result);
  };

  const fetchAnalytics = async () => {
    const res = await fetch("/api/admin/analytics", { credentials: "include" });
    const result = await res.json();
    if (result.error) setAnalyticsError(result.error);
    else setData(result);
  };

  const fetchEvents = async () => {
    const from = new Date(); from.setDate(1); from.setHours(0, 0, 0, 0);
    const to   = new Date(from.getFullYear(), from.getMonth() + 3, 0);
    const res  = await fetch(`/api/events?from=${from.toISOString()}&to=${to.toISOString()}`, { credentials: "include" });
    const result = await res.json();
    if (Array.isArray(result)) setEvents(result);
  };

  useEffect(() => {
    fetchUsers();
    fetchAnalytics();
    fetchEvents();
  }, []);

  const bdHeads = users.filter((u) =>
    u.roles?.some((r: any) => r.role.name === "BD_HEAD")
  );

  return (
    <>
      <div className="page-header">
        <h1>Admin Overview</h1>
        <p>Organization-wide performance and team management</p>
      </div>

      {analyticsError && (
        <div className="alert alert-error" style={{ marginBottom: 20 }}>
          {analyticsError}
        </div>
      )}

      {/* ── Stats ── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: 14,
          marginBottom: 24,
        }}
      >
        <div className="stat-card">
          <div className="stat-label">Total Orders</div>
          <div className="stat-value">{data?.totalOrders ?? "—"}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total Revenue</div>
          <div className="stat-value" style={{ color: "var(--green)" }}>
            {data ? `₹${data.totalRevenue.toLocaleString()}` : "—"}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Sales Reps</div>
          <div className="stat-value">
            {users.filter((u) => u.roles?.some((r: any) => r.role.name === "SALES")).length || "—"}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">BD Heads</div>
          <div className="stat-value">{bdHeads.length || "—"}</div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "3fr 2fr", gap: 16 }}>
        {/* ── Top Schools ── */}
        <div className="card">
          <h2 style={{ marginBottom: 16 }}>Top Schools by Revenue</h2>
          {!data ? (
            <p style={{ color: "var(--text-muted)", fontSize: 13 }}>Loading...</p>
          ) : !data.topSchools?.length ? (
            <div className="empty-state">
              <p>No revenue yet</p>
              <p>Revenue appears once BD approves orders</p>
            </div>
          ) : (
            <div>
              {data.topSchools.map((school: any, i: number) => {
                const maxRev = data.topSchools[0].revenue;
                const pct    = (school.revenue / maxRev) * 100;
                return (
                  <div key={i} style={{ marginBottom: 12 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3, fontSize: 13 }}>
                      <span style={{ fontWeight: 500 }}>{school.name}</span>
                      <span style={{ fontWeight: 600, fontFamily: "monospace" }}>₹{school.revenue.toLocaleString()}</span>
                    </div>
                    <div style={{ background: "var(--border)", borderRadius: 99, height: 4, overflow: "hidden" }}>
                      <div style={{ width: `${pct}%`, height: "100%", background: "var(--accent)", borderRadius: 99, transition: "width 0.5s ease" }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Latest Reports ── */}
        <div className="card">
          <h2 style={{ marginBottom: 16 }}>Latest Reports</h2>
          {!data ? (
            <p style={{ color: "var(--text-muted)", fontSize: 13 }}>Loading...</p>
          ) : !data.latestReports?.length ? (
            <div className="empty-state">
              <p>No reports yet</p>
              <p>Sales reps haven't submitted any daily reports</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
              {data.latestReports.map((report: any, i: number) => (
                <div
                  key={report.id}
                  style={{
                    padding: "10px 0",
                    borderBottom: i < data.latestReports.length - 1 ? "1px solid var(--border-soft)" : "none",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 3 }}>
                    <span style={{ fontWeight: 500, fontSize: 13.5 }}>
                      {report.salesUser?.name ?? "Unknown"}
                    </span>
                    <Badge status={report.status} />
                  </div>
                  <p style={{ color: "var(--text-secondary)", fontSize: 13, margin: "2px 0" }}>
                    {report.summary}
                  </p>
                  <p style={{ color: "var(--text-muted)", fontSize: 11.5 }}>
                    {new Date(report.createdAt).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Calendar + Upcoming Events ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 16 }}>
        <div className="card">
          <h2 style={{ marginBottom: 14 }}>Calendar</h2>
          <EventCalendar events={events} />
        </div>
        <div className="card">
          <h2 style={{ marginBottom: 14 }}>Upcoming Events</h2>
          <UpcomingEvents events={events} />
        </div>
      </div>

      {/* ── Manage Reporting ── */}
      <div className="card" style={{ marginTop: 16 }}>
        <h2 style={{ marginBottom: 16 }}>Manage Reporting Lines</h2>
        {users.length === 0 ? (
          <p style={{ color: "var(--text-muted)", fontSize: 13 }}>Loading users...</p>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Role</th>
                  <th>Reports To</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id}>
                    <td style={{ fontWeight: 500 }}>{user.name}</td>
                    <td>
                      {user.roles?.map((r: any) => (
                        <Badge key={r.role.name} status={r.role.name} />
                      ))}
                    </td>
                    <td>
                      <select
                        className="input"
                        style={{ maxWidth: 200 }}
                        value={user.managerId || ""}
                        onChange={async (e) => {
                          await fetch("/api/admin/update-user", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            credentials: "include",
                            body: JSON.stringify({
                              userId: user.id,
                              managerId: e.target.value || null,
                            }),
                          });
                          await fetchUsers();
                        }}
                      >
                        <option value="">No Manager</option>
                        {bdHeads.map((bd) => (
                          <option key={bd.id} value={bd.id}>{bd.name}</option>
                        ))}
                      </select>
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
