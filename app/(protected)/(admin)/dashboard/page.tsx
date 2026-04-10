"use client";

import { useEffect, useState } from "react";
import Badge from "@/app/components/Badge";
import { EventCalendar, UpcomingEvents } from "@/app/components/EventCalendar";

export default function AdminDashboard() {
  const [data, setData]         = useState<any>(null);
  const [users, setUsers]       = useState<any[]>([]);
  const [events, setEvents]     = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [analyticsError, setAnalyticsError] = useState("");

  const fetchUsers = async () => {
    const res    = await fetch("/api/admin/users", { credentials: "include" });
    const result = await res.json();
    if (Array.isArray(result)) setUsers(result);
  };

  const fetchAnalytics = async () => {
    const res    = await fetch("/api/admin/analytics", { credentials: "include" });
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

  const fetchAuditLogs = async () => {
    const res    = await fetch("/api/admin/audit-log?page=1&limit=10", { credentials: "include" });
    const result = await res.json();
    if (Array.isArray(result.logs)) setAuditLogs(result.logs);
  };

  useEffect(() => {
    fetchUsers();
    fetchAnalytics();
    fetchEvents();
    fetchAuditLogs();
  }, []);

  const bdHeads      = users.filter((u) => u.roles?.some((r: any) => r.role.name === "BD_HEAD"));
  const pendingOrders = data?.pendingOrders ?? data?.thisMonthOrders ?? "—";
  const totalUsers    = users.length || "—";

  const ACTION_COLORS: Record<string, string> = {
    ORDER_CREATED:         "badge-green",
    ORDER_APPROVED:        "badge-blue",
    ORDER_REJECTED:        "badge-red",
    SCHOOLS_BULK_IMPORTED: "badge-indigo",
    UPDATE_SETTINGS:       "badge-gray",
    RESET_PASSWORD:        "badge-yellow",
    USER_CREATED:          "badge-green",
    USER_UPDATED:          "badge-gray",
    DOCUMENT_APPROVED:     "badge-green",
    DOCUMENT_REJECTED:     "badge-red",
  };

  return (
    <>
      <div className="page-header">
        <h1>Dashboard</h1>
        <p>Organization-wide performance and team management</p>
      </div>

      {analyticsError && (
        <div className="alert alert-error" style={{ marginBottom: 20 }}>
          {analyticsError}
        </div>
      )}

      {/* ── Stats Grid ── */}
      <div className="stats-grid" style={{ marginBottom: 24 }}>
        <div className="stat-card">
          <div className="stat-label">Total Orders</div>
          <div className="stat-value">{data?.totalOrders ?? "—"}</div>
          {data && (
            <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>
              This month: <strong>{data.thisMonthOrders}</strong>
              {data.momOrders !== 0 && (
                <span style={{ marginLeft: 6, fontWeight: 600, color: data.momOrders > 0 ? "var(--green)" : "var(--red)" }}>
                  {data.momOrders > 0 ? "▲" : "▼"}{Math.abs(data.momOrders)}% MoM
                </span>
              )}
            </div>
          )}
        </div>
        <div className="stat-card">
          <div className="stat-label">Total Revenue</div>
          <div className="stat-value" style={{ color: "var(--green)" }}>
            {data ? `₹${data.totalRevenue.toLocaleString()}` : "—"}
          </div>
          {data && (
            <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>
              This month: <strong style={{ color: "var(--green)" }}>₹{(data.thisMonthRevenue ?? 0).toLocaleString()}</strong>
              {data.momRevenue !== 0 && (
                <span style={{ marginLeft: 6, fontWeight: 600, color: data.momRevenue > 0 ? "var(--green)" : "var(--red)" }}>
                  {data.momRevenue > 0 ? "▲" : "▼"}{Math.abs(data.momRevenue)}% MoM
                </span>
              )}
            </div>
          )}
        </div>
        <div className="stat-card">
          <div className="stat-label">Pending Orders</div>
          <div className="stat-value">{pendingOrders}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total Users</div>
          <div className="stat-value">{totalUsers}</div>
        </div>
      </div>

      {/* ── Monthly Revenue ── */}
      <div className="card" style={{ marginBottom: 16 }}>
        <h2 style={{ marginBottom: 16 }}>Monthly Revenue</h2>
        {!data ? (
          <div style={{ color: "var(--text-muted)", padding: "40px 0", textAlign: "center" }}>Loading...</div>
        ) : !data.topSchools?.length ? (
          <div className="empty-state">
            <p>No revenue data yet</p>
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

      {/* ── Pipeline + Product Breakdown ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
        <div className="card">
          <h2 style={{ marginBottom: 14 }}>Pipeline Breakdown</h2>
          {!data ? (
            <div style={{ color: "var(--text-muted)", padding: "40px 0", textAlign: "center" }}>Loading...</div>
          ) : !data.pipelineBreakdown?.length ? (
            <div className="empty-state">
              <p>No pipeline data</p>
              <p>Pipeline stages will appear here</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {data.pipelineBreakdown.map((item: any) => (
                <div key={item.stage} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>{item.stage}</span>
                  <span className="badge badge-blue">{item.count}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="card">
          <h2 style={{ marginBottom: 14 }}>Product Breakdown</h2>
          {!data ? (
            <div style={{ color: "var(--text-muted)", padding: "40px 0", textAlign: "center" }}>Loading...</div>
          ) : !data.productBreakdown?.length ? (
            <div className="empty-state">
              <p>No product data</p>
              <p>Product stats will appear once orders are placed</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {data.productBreakdown.map((item: any) => (
                <div key={item.product} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>{item.product}</span>
                  <span className="badge badge-indigo">{item.count}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Pending Approvals ── */}
      <div className="card" style={{ marginBottom: 16 }}>
        <h2 style={{ marginBottom: 12 }}>Pending Approvals</h2>
        {!data ? (
          <div style={{ color: "var(--text-muted)", padding: "40px 0", textAlign: "center" }}>Loading...</div>
        ) : (
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
            {(data.pendingContentReview ?? 0) > 0 && (
              <a href="/admin/content" className="btn btn-secondary" style={{ fontSize: 13 }}>
                Content Review
                <span className="badge badge-yellow" style={{ marginLeft: 8 }}>{data.pendingContentReview}</span>
              </a>
            )}
            {(data.pendingOrderApprovals ?? 0) > 0 && (
              <a href="/orders" className="btn btn-secondary" style={{ fontSize: 13 }}>
                Order Approvals
                <span className="badge badge-yellow" style={{ marginLeft: 8 }}>{data.pendingOrderApprovals}</span>
              </a>
            )}
            {!(data.pendingContentReview) && !(data.pendingOrderApprovals) && (
              <p style={{ color: "var(--text-muted)", fontSize: 13, margin: 0 }}>No pending approvals</p>
            )}
          </div>
        )}
      </div>

      {/* ── Latest Reports + Calendar ── */}
      <div style={{ display: "grid", gridTemplateColumns: "3fr 2fr", gap: 16, marginBottom: 16 }}>
        <div className="card">
          <h2 style={{ marginBottom: 16 }}>Latest Reports</h2>
          {!data ? (
            <div style={{ color: "var(--text-muted)", padding: "40px 0", textAlign: "center" }}>Loading...</div>
          ) : !data.latestReports?.length ? (
            <div className="empty-state">
              <p>No reports yet</p>
              <p>Sales reps haven&apos;t submitted any daily reports</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
              {data.latestReports.map((report: any, i: number) => (
                <div
                  key={report.id}
                  style={{
                    padding: "10px 0",
                    borderBottom: i < data.latestReports.length - 1 ? "1px solid var(--border)" : "none",
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

        <div className="card">
          <h2 style={{ marginBottom: 14 }}>Upcoming Events</h2>
          <UpcomingEvents events={events} />
        </div>
      </div>

      {/* ── Calendar ── */}
      <div className="card" style={{ marginBottom: 16 }}>
        <h2 style={{ marginBottom: 14 }}>Calendar</h2>
        <EventCalendar events={events} />
      </div>

      {/* ── Recent Audit Log ── */}
      <div className="card" style={{ marginBottom: 16 }}>
        <h2 style={{ marginBottom: 16 }}>Recent Audit Log</h2>
        {auditLogs.length === 0 ? (
          <div style={{ color: "var(--text-muted)", padding: "40px 0", textAlign: "center" }}>Loading...</div>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Action</th>
                  <th>Entity</th>
                  <th>User</th>
                  <th>Time</th>
                </tr>
              </thead>
              <tbody>
                {auditLogs.map((log) => (
                  <tr key={log.id}>
                    <td>
                      <span className={`badge ${ACTION_COLORS[log.action] ?? "badge-gray"}`} style={{ fontSize: 11 }}>
                        {log.action.replaceAll("_", " ")}
                      </span>
                    </td>
                    <td style={{ color: "var(--text-secondary)", fontSize: 13 }}>
                      {log.entity ?? "—"}
                    </td>
                    <td style={{ fontWeight: 500, fontSize: 13 }}>
                      {log.userName ?? log.userId ?? "System"}
                    </td>
                    <td style={{ color: "var(--text-muted)", fontSize: 12.5, whiteSpace: "nowrap" }}>
                      {new Date(log.createdAt).toLocaleDateString("en-IN", {
                        day: "2-digit", month: "short", year: "numeric",
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Manage Reporting ── */}
      <div className="card">
        <h2 style={{ marginBottom: 16 }}>Manage Reporting Lines</h2>
        {users.length === 0 ? (
          <div style={{ color: "var(--text-muted)", padding: "40px 0", textAlign: "center" }}>Loading...</div>
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
