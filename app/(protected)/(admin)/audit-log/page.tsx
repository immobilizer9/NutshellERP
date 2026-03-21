"use client";

import { useEffect, useState } from "react";

const ACTION_COLORS: Record<string, string> = {
  ORDER_CREATED:        "badge-green",
  ORDER_APPROVED:       "badge-blue",
  ORDER_REJECTED:       "badge-red",
  SCHOOLS_BULK_IMPORTED:"badge-indigo",
};

export default function AuditLogPage() {
  const [logs, setLogs]   = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage]   = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter]   = useState("");

  const fetchLogs = async (p = 1, action = "") => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(p), limit: "50" });
    if (action) params.set("action", action);

    const res  = await fetch(`/api/admin/audit-log?${params}`, { credentials: "include" });
    const data = await res.json();

    setLogs(data.logs ?? []);
    setTotal(data.total ?? 0);
    setPage(data.page ?? 1);
    setPages(data.pages ?? 1);
    setLoading(false);
  };

  useEffect(() => { fetchLogs(1, filter); }, []);

  const handleFilter = (val: string) => {
    setFilter(val);
    fetchLogs(1, val);
  };

  const handlePage = (p: number) => {
    fetchLogs(p, filter);
  };

  const distinctActions = [
    "ORDER_CREATED",
    "ORDER_APPROVED",
    "ORDER_REJECTED",
    "SCHOOLS_BULK_IMPORTED",
  ];

  return (
    <>
      <div className="page-header">
        <h1>Audit Log</h1>
        <p>{total.toLocaleString()} events recorded</p>
      </div>

      {/* ── Filters ── */}
      <div style={{ display: "flex", gap: 6, marginBottom: 20, flexWrap: "wrap" }}>
        <button
          onClick={() => handleFilter("")}
          style={{
            padding: "5px 14px", borderRadius: 99, fontSize: 12.5, fontWeight: 500,
            border: "1px solid var(--border)", cursor: "pointer", fontFamily: "inherit",
            background: filter === "" ? "var(--accent)" : "var(--surface)",
            color: filter === "" ? "#fff" : "var(--text-secondary)",
            transition: "all 0.15s",
          }}
        >
          All
        </button>
        {distinctActions.map((a) => (
          <button
            key={a}
            onClick={() => handleFilter(a)}
            style={{
              padding: "5px 14px", borderRadius: 99, fontSize: 12.5, fontWeight: 500,
              border: "1px solid var(--border)", cursor: "pointer", fontFamily: "inherit",
              background: filter === a ? "var(--accent)" : "var(--surface)",
              color: filter === a ? "#fff" : "var(--text-secondary)",
              transition: "all 0.15s",
            }}
          >
            {a.replaceAll("_", " ")}
          </button>
        ))}
      </div>

      <div className="card">
        {loading ? (
          <p style={{ color: "var(--text-muted)", fontSize: 13 }}>Loading...</p>
        ) : logs.length === 0 ? (
          <div className="empty-state">
            <p>No audit events found</p>
            <p>Actions taken in the system will appear here</p>
          </div>
        ) : (
          <>
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Action</th>
                    <th>Entity</th>
                    <th>User</th>
                    <th>Details</th>
                    <th>Time</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log.id}>
                      <td>
                        <span className={`badge ${ACTION_COLORS[log.action] ?? "badge-gray"}`}>
                          {log.action.replaceAll("_", " ")}
                        </span>
                      </td>
                      <td style={{ color: "var(--text-secondary)", fontSize: 13 }}>
                        {log.entity ?? "—"}
                        {log.entityId && (
                          <span style={{ color: "var(--text-muted)", fontSize: 11, display: "block", fontFamily: "monospace" }}>
                            {log.entityId.slice(0, 12)}...
                          </span>
                        )}
                      </td>
                      <td style={{ fontWeight: 500, fontSize: 13 }}>
                        {log.userName ?? log.userId ?? "System"}
                      </td>
                      <td style={{ fontSize: 12, color: "var(--text-muted)", maxWidth: 260 }}>
                        {log.metadata
                          ? Object.entries(log.metadata as Record<string, any>)
                              .map(([k, v]) => `${k}: ${v}`)
                              .join(" · ")
                          : "—"}
                      </td>
                      <td style={{ color: "var(--text-muted)", fontSize: 12.5, whiteSpace: "nowrap" }}>
                        {new Date(log.createdAt).toLocaleString("en-IN", {
                          day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pages > 1 && (
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 16, fontSize: 13 }}>
                <span style={{ color: "var(--text-muted)" }}>
                  Page {page} of {pages} · {total} total events
                </span>
                <div style={{ display: "flex", gap: 6 }}>
                  <button
                    className="btn btn-secondary"
                    disabled={page === 1}
                    onClick={() => handlePage(page - 1)}
                    style={{ fontSize: 12 }}
                  >
                    ← Prev
                  </button>
                  <button
                    className="btn btn-secondary"
                    disabled={page === pages}
                    onClick={() => handlePage(page + 1)}
                    style={{ fontSize: 12 }}
                  >
                    Next →
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
