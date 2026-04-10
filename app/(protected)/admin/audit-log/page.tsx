"use client";

import { useEffect, useState } from "react";

const ACTION_COLORS: Record<string, string> = {
  ORDER_CREATED:         "badge-green",
  ORDER_APPROVED:        "badge-blue",
  ORDER_REJECTED:        "badge-red",
  SCHOOLS_BULK_IMPORTED: "badge-indigo",
  UPDATE_SETTINGS:       "badge-gray",
  RESET_PASSWORD:        "badge-yellow",
  USER_CREATED:          "badge-green",
  USER_UPDATED:          "badge-gray",
  TASK_CREATED:          "badge-indigo",
  DOCUMENT_APPROVED:     "badge-green",
  DOCUMENT_REJECTED:     "badge-red",
};

function downloadCSV(logs: any[]) {
  const headers = ["Time", "Action", "Entity", "User", "Details"];
  const rows = logs.map((l) => [
    new Date(l.createdAt).toLocaleString("en-IN"),
    l.action,
    `${l.entity ?? ""}${l.entityId ? ` (${l.entityId.slice(0, 8)})` : ""}`,
    l.userName ?? l.userId ?? "System",
    l.metadata
      ? Object.entries(l.metadata as Record<string, any>).slice(0, 6).map(([k, v]) => `${k}:${v}`).join("; ")
      : "",
  ]);
  const csv = [headers, ...rows]
    .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href = url;
  a.download = `audit-log-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

const ALL_ACTIONS = [
  "ORDER_CREATED", "ORDER_APPROVED", "ORDER_REJECTED",
  "SCHOOLS_BULK_IMPORTED", "UPDATE_SETTINGS", "RESET_PASSWORD",
  "USER_CREATED", "USER_UPDATED", "TASK_CREATED",
  "DOCUMENT_APPROVED", "DOCUMENT_REJECTED",
];

export default function AuditLogPage() {
  const [logs,    setLogs]    = useState<any[]>([]);
  const [total,   setTotal]   = useState(0);
  const [page,    setPage]    = useState(1);
  const [pages,   setPages]   = useState(1);
  const [loading, setLoading] = useState(true);
  const [filter,  setFilter]  = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo,   setDateTo]   = useState("");
  const [exporting, setExporting] = useState(false);

  const fetchLogs = async (p = 1, action = "", from = "", to = "") => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(p), limit: "50" });
    if (action) params.set("action", action);
    if (from)   params.set("from",   from);
    if (to)     params.set("to",     to);
    const res  = await fetch(`/api/admin/audit-log?${params}`, { credentials: "include" });
    const data = await res.json();
    setLogs(data.logs ?? []);
    setTotal(data.total ?? 0);
    setPage(data.page ?? 1);
    setPages(data.pages ?? 1);
    setLoading(false);
  };

  const handleExport = async () => {
    setExporting(true);
    const params = new URLSearchParams({ page: "1", limit: "9999" });
    if (filter)   params.set("action", filter);
    if (dateFrom) params.set("from",   dateFrom);
    if (dateTo)   params.set("to",     dateTo);
    const res  = await fetch(`/api/admin/audit-log?${params}`, { credentials: "include" });
    const data = await res.json();
    downloadCSV(data.logs ?? []);
    setExporting(false);
  };

  useEffect(() => { fetchLogs(1, filter, dateFrom, dateTo); }, []);

  const applyDates = () => fetchLogs(1, filter, dateFrom, dateTo);
  const clearDates = () => { setDateFrom(""); setDateTo(""); fetchLogs(1, filter, "", ""); };

  const handleFilter = (val: string) => {
    setFilter(val);
    fetchLogs(1, val, dateFrom, dateTo);
  };

  return (
    <>
      <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h1>Audit Log</h1>
          <p>Track all system actions</p>
        </div>
        <button className="btn" onClick={handleExport} disabled={exporting} style={{ fontSize: 12.5 }}>
          {exporting ? "Exporting…" : "↓ Export CSV"}
        </button>
      </div>

      {/* Filters */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", gap: 8, marginBottom: 12, alignItems: "center", flexWrap: "wrap" }}>
          <label className="form-label" style={{ margin: 0, flexShrink: 0 }}>Date range:</label>
          <input type="date" className="input" style={{ width: 150, fontSize: 13 }}
            value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
          <span style={{ color: "var(--text-muted)", fontSize: 13 }}>→</span>
          <input type="date" className="input" style={{ width: 150, fontSize: 13 }}
            value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
          <button className="btn btn-primary" style={{ fontSize: 12 }} onClick={applyDates}>Apply</button>
          {(dateFrom || dateTo) && (
            <button className="btn" style={{ fontSize: 12 }} onClick={clearDates}>Clear</button>
          )}
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          <button onClick={() => handleFilter("")} className="btn"
            style={{ fontSize: 12, background: filter === "" ? "var(--accent)" : undefined, color: filter === "" ? "#fff" : undefined }}>
            All
          </button>
          {ALL_ACTIONS.map((a) => (
            <button key={a} onClick={() => handleFilter(a)} className="btn"
              style={{ fontSize: 11.5, background: filter === a ? "var(--accent)" : undefined, color: filter === a ? "#fff" : undefined }}>
              {a.replaceAll("_", " ")}
            </button>
          ))}
        </div>
      </div>

      <div className="card">
        {loading ? (
          <div style={{ color: "var(--text-muted)", padding: "40px 0", textAlign: "center" }}>Loading...</div>
        ) : logs.length === 0 ? (
          <div className="empty-state">
            <p>No audit events found</p>
            <p>Try adjusting the filters or date range</p>
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
                        <span className={`badge ${ACTION_COLORS[log.action] ?? "badge-gray"}`} style={{ fontSize: 11 }}>
                          {log.action.replaceAll("_", " ")}
                        </span>
                      </td>
                      <td style={{ color: "var(--text-secondary)", fontSize: 13 }}>
                        {log.entity ?? "—"}
                        {log.entityId && (
                          <span style={{ color: "var(--text-muted)", fontSize: 11, display: "block", fontFamily: "monospace" }}>
                            {log.entityId.slice(0, 12)}…
                          </span>
                        )}
                      </td>
                      <td style={{ fontWeight: 500, fontSize: 13 }}>
                        {log.userName ?? log.userId ?? "System"}
                      </td>
                      <td style={{ fontSize: 12, color: "var(--text-muted)", maxWidth: 260 }}>
                        {log.metadata
                          ? Object.entries(log.metadata as Record<string, any>)
                              .slice(0, 4)
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

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 16, fontSize: 13 }}>
              <span style={{ color: "var(--text-muted)" }}>
                Page {page} of {pages} · {total} total events
              </span>
              {pages > 1 && (
                <div style={{ display: "flex", gap: 6 }}>
                  <button className="btn" disabled={page === 1} onClick={() => fetchLogs(page - 1, filter, dateFrom, dateTo)} style={{ fontSize: 12 }}>
                    ← Prev
                  </button>
                  <button className="btn" disabled={page === pages} onClick={() => fetchLogs(page + 1, filter, dateFrom, dateTo)} style={{ fontSize: 12 }}>
                    Next →
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </>
  );
}
