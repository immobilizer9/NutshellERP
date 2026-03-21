"use client";

import { useEffect, useState } from "react";
import Badge from "@/app/components/Badge";

export default function AdminDashboard() {
  const [data, setData] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
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

  useEffect(() => {
    fetchUsers();
    fetchAnalytics();
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
        {/* ── Leaderboard ── */}
        <div className="card">
          <h2 style={{ marginBottom: 16 }}>Sales Leaderboard</h2>
          {!data ? (
            <p style={{ color: "var(--text-muted)", fontSize: 13 }}>Loading...</p>
          ) : data.leaderboard?.length === 0 ? (
            <div className="empty-state">
              <p>No data yet</p>
              <p>Revenue appears once BD approves orders</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
              {data.leaderboard?.map((user: any, i: number) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "10px 0",
                    borderBottom: i < data.leaderboard.length - 1 ? "1px solid var(--border-soft)" : "none",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span
                      style={{
                        width: 22,
                        height: 22,
                        borderRadius: "50%",
                        background: i === 0 ? "#fef3c7" : "var(--bg-subtle)",
                        color: i === 0 ? "#92400e" : "var(--text-muted)",
                        fontSize: 11,
                        fontWeight: 700,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      {i + 1}
                    </span>
                    <span style={{ fontWeight: 500, fontSize: 13.5 }}>{user.name}</span>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontWeight: 600, fontSize: 13.5 }}>
                      ₹{user.revenue.toLocaleString()}
                    </div>
                    <div style={{ color: "var(--text-muted)", fontSize: 11.5 }}>
                      {user.orders} order{user.orders !== 1 ? "s" : ""}
                    </div>
                  </div>
                </div>
              ))}
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
