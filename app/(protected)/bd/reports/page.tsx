"use client";

import { useEffect, useState } from "react";
import Badge from "@/app/components/Badge";

export default function BDReportsPage() {
  const [data, setData] = useState<any>(null);
  const [reviewing, setReviewing] = useState<string | null>(null);
  // ✅ Per-report comment state — keyed by report ID
  const [comments, setComments] = useState<Record<string, string>>({});

  const fetchData = async () => {
    const res = await fetch("/api/bd/analytics", { credentials: "include" });
    const result = await res.json();
    setData(result);
  };

  useEffect(() => { fetchData(); }, []);

  const reviewReport = async (reportId: string, status: string) => {
    setReviewing(reportId);
    await fetch("/api/bd/review-report", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      // ✅ Reads from per-report comment state — not a shared onBlur-captured value
      body: JSON.stringify({ reportId, status, comment: comments[reportId] ?? "" }),
    });
    // Clear the comment for this report after submission
    setComments((prev) => { const next = { ...prev }; delete next[reportId]; return next; });
    setReviewing(null);
    fetchData();
  };

  if (!data) return <div style={{ color: "var(--text-muted)", padding: "40px 0", textAlign: "center" }}>Loading...</div>;

  return (
    <>
      <div className="page-header">
        <h1>Reports</h1>
        <p>Daily field activity reports from your team</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>

        {/* ── Sales Activity Status ── */}
        <div className="card">
          <h2 style={{ marginBottom: 14 }}>Team Activity</h2>
          {!data.salesActivityStatus?.length ? (
            <div className="empty-state"><p>No team members found</p></div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
              {data.salesActivityStatus.map((user: any, i: number) => (
                <div
                  key={user.userId}
                  style={{
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    padding: "10px 0",
                    borderBottom: i < data.salesActivityStatus.length - 1 ? "1px solid var(--border-soft)" : "none",
                  }}
                >
                  <div>
                    <p style={{ fontWeight: 500, fontSize: 13.5, margin: 0 }}>{user.name}</p>
                    <p style={{ color: "var(--text-muted)", fontSize: 12, margin: "2px 0 0" }}>
                      {user.lastActivity
                        ? `Last active ${new Date(user.lastActivity).toLocaleDateString()}`
                        : "No activity recorded"}
                    </p>
                  </div>
                  <Badge status={user.isInactive ? "INACTIVE" : "ACTIVE"} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Task Performance ── */}
        <div className="card">
          <h2 style={{ marginBottom: 14 }}>Task Performance</h2>
          {!data.tasks?.length ? (
            <div className="empty-state"><p>No tasks assigned yet</p></div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {data.tasks.map((task: any) => {
                const overdue = task.status !== "COMPLETED" && new Date(task.dueDate) < new Date();
                return (
                  <div
                    key={task.id}
                    style={{
                      padding: "10px 12px", borderRadius: "var(--radius)",
                      border: `1px solid ${overdue ? "var(--red-border)" : "var(--border)"}`,
                      background: overdue ? "var(--red-bg)" : "var(--bg)",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <div>
                        {overdue && (
                          <span style={{ fontSize: 10.5, fontWeight: 700, color: "var(--red)", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 2 }}>
                            Overdue
                          </span>
                        )}
                        <p style={{ fontWeight: 500, margin: 0, fontSize: 13.5 }}>{task.title}</p>
                        <p style={{ color: "var(--text-muted)", fontSize: 12, margin: "2px 0 0" }}>
                          {task.assignedTo?.name} · Due {new Date(task.dueDate).toLocaleDateString()}
                        </p>
                      </div>
                      <Badge status={task.status} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Daily Reports ── */}
      <div className="card" style={{ marginTop: 16 }}>
        <h2 style={{ marginBottom: 14 }}>Daily Reports</h2>
        {!data.reports?.length ? (
          <div className="empty-state">
            <p>No reports submitted yet</p>
            <p>Reports from your sales team will appear here</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {data.reports.map((report: any) => (
              <div
                key={report.id}
                style={{
                  border: "1px solid var(--border)", borderRadius: "var(--radius-lg)",
                  padding: "14px 16px",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                  <div>
                    <p style={{ fontWeight: 600, margin: 0 }}>{report.salesUser?.name}</p>
                    <p style={{ color: "var(--text-muted)", fontSize: 12, margin: "2px 0 0" }}>
                      {new Date(report.createdAt).toLocaleString()}
                      {report.location && ` · ${report.location}`}
                    </p>
                  </div>
                  <Badge status={report.status} />
                </div>

                <p style={{ color: "var(--text-secondary)", fontSize: 13.5, margin: "0 0 10px", lineHeight: 1.5 }}>
                  {report.summary}
                </p>

                {report.bdComment && (
                  <div style={{
                    background: "var(--blue-bg)", border: "1px solid var(--blue-border)",
                    borderRadius: "var(--radius)", padding: "8px 12px", marginBottom: 10,
                  }}>
                    <p style={{ fontSize: 12, color: "var(--blue)", margin: 0 }}>
                      <strong>Your comment:</strong> {report.bdComment}
                    </p>
                  </div>
                )}

                {report.status === "PENDING" && (
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    {/* ✅ Controlled input — value tied to state, updates on every keystroke */}
                    <input
                      className="input"
                      placeholder="Add a comment (optional)..."
                      style={{ flex: 1 }}
                      value={comments[report.id] ?? ""}
                      onChange={(e) =>
                        setComments((prev) => ({ ...prev, [report.id]: e.target.value }))
                      }
                    />
                    <button
                      className="btn btn-success"
                      disabled={reviewing === report.id}
                      onClick={() => reviewReport(report.id, "APPROVED")}
                    >
                      {reviewing === report.id ? "..." : "Approve"}
                    </button>
                    <button
                      className="btn btn-danger"
                      disabled={reviewing === report.id}
                      onClick={() => reviewReport(report.id, "REJECTED")}
                    >
                      Reject
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
