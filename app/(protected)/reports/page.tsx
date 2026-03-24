"use client";

import { useEffect, useState } from "react";

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export default function ReportsPage() {
  const [modules, setModules]   = useState<string[]>([]);
  const [reports, setReports]   = useState<any[]>([]);
  const [bdData, setBdData]     = useState<any>(null);
  const [loading, setLoading]   = useState(true);
  const [form, setForm]         = useState({ summary: "", location: "" });
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg]           = useState({ text: "", ok: false });
  const [reviewing, setReviewing] = useState<string | null>(null);
  const [comments, setComments] = useState<Record<string, string>>({});

  useEffect(() => {
    fetch("/api/auth/me", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => { if (d?.user?.modules) setModules(d.user.modules); });
  }, []);

  const isManager = modules.includes("TEAM_MANAGEMENT");

  const fetchAll = async () => {
    setLoading(true);
    if (isManager) {
      const res = await fetch("/api/bd/analytics", { credentials: "include" }).then((r) => r.json());
      setBdData(res);
    } else {
      const res = await fetch("/api/sales/daily-report", { credentials: "include" }).then((r) => r.json());
      setReports(Array.isArray(res) ? res : []);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (modules.length > 0) fetchAll();
  }, [modules]);

  const submitReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.summary.trim()) { setMsg({ text: "Summary is required.", ok: false }); return; }
    setSubmitting(true); setMsg({ text: "", ok: false });
    try {
      let latitude: number | undefined;
      let longitude: number | undefined;
      try {
        const pos = await new Promise<GeolocationPosition>((res, rej) =>
          navigator.geolocation.getCurrentPosition(res, rej, { timeout: 4000 })
        );
        latitude  = pos.coords.latitude;
        longitude = pos.coords.longitude;
      } catch {}

      const res = await fetch("/api/sales/daily-report", {
        method: "POST", headers: { "Content-Type": "application/json" },
        credentials: "include", body: JSON.stringify({ ...form, latitude, longitude }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setMsg({ text: "Report submitted!", ok: true });
      setForm({ summary: "", location: "" });
      fetchAll();
    } catch (err: any) {
      setMsg({ text: err.message, ok: false });
    } finally {
      setSubmitting(false);
    }
  };

  const reviewReport = async (reportId: string, status: string) => {
    setReviewing(reportId);
    await fetch("/api/bd/review-report", {
      method: "POST", headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ reportId, status, comment: comments[reportId] ?? "" }),
    });
    setComments((prev) => { const next = { ...prev }; delete next[reportId]; return next; });
    setReviewing(null);
    fetchAll();
  };

  if (loading && modules.length === 0) {
    return <div className="page-header"><h1>Daily Reports</h1></div>;
  }

  // ─── Manager view: review team reports ──────────────────────────
  if (isManager) {
    const pendingReports = bdData?.recentReports?.filter((r: any) => r.status === "PENDING") ?? [];
    const allReports     = bdData?.recentReports ?? [];

    return (
      <>
        <div className="page-header">
          <h1>Daily Reports</h1>
          <p>Field activity reports from your team</p>
        </div>

        {loading ? (
          <p style={{ color: "var(--text-muted)" }}>Loading…</p>
        ) : (
          <>
            {/* Team activity status */}
            <div className="card" style={{ marginBottom: 20 }}>
              <h2 style={{ marginBottom: 12 }}>Team Activity Today</h2>
              <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                {(bdData?.salesActivityStatus ?? []).map((user: any, i: number, arr: any[]) => (
                  <div key={user.userId} style={{
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    padding: "10px 0",
                    borderBottom: i < arr.length - 1 ? "1px solid var(--border)" : "none",
                  }}>
                    <div>
                      <div style={{ fontWeight: 500, fontSize: 13.5 }}>{user.name}</div>
                      <div style={{ color: "var(--text-muted)", fontSize: 12, marginTop: 2 }}>
                        {user.lastActivity ? `Last active ${formatDate(user.lastActivity)}` : "No activity recorded"}
                      </div>
                    </div>
                    <span style={{
                      fontSize: 11, fontWeight: 600, padding: "3px 9px", borderRadius: 99,
                      background: user.isInactive ? "rgba(220,38,38,0.1)" : "rgba(22,163,74,0.1)",
                      color: user.isInactive ? "var(--red)" : "var(--green)",
                    }}>
                      {user.isInactive ? "Inactive" : "Active"}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Pending reports */}
            {pendingReports.length > 0 && (
              <div className="card" style={{ marginBottom: 20 }}>
                <h2 style={{ marginBottom: 12 }}>Pending Review ({pendingReports.length})</h2>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {pendingReports.map((r: any) => (
                    <div key={r.id} style={{ borderBottom: "1px solid var(--border)", paddingBottom: 12 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                        <div>
                          <div style={{ fontWeight: 500 }}>{r.salesUser?.name}</div>
                          <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{formatDate(r.createdAt)}</div>
                        </div>
                        {r.location && <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{r.location}</span>}
                      </div>
                      <p style={{ fontSize: 13, marginBottom: 8 }}>{r.summary}</p>
                      <textarea
                        className="input"
                        rows={2}
                        placeholder="Add comment (optional)"
                        value={comments[r.id] ?? ""}
                        onChange={(e) => setComments((c) => ({ ...c, [r.id]: e.target.value }))}
                        style={{ marginBottom: 8 }}
                      />
                      <div style={{ display: "flex", gap: 8 }}>
                        <button className="btn btn-primary" style={{ fontSize: 12 }}
                          onClick={() => reviewReport(r.id, "APPROVED")}
                          disabled={reviewing === r.id}>
                          Approve
                        </button>
                        <button className="btn btn-danger" style={{ fontSize: 12 }}
                          onClick={() => reviewReport(r.id, "REJECTED")}
                          disabled={reviewing === r.id}>
                          Reject
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* All reports */}
            <div className="card">
              <h2 style={{ marginBottom: 12 }}>Recent Reports</h2>
              {allReports.length === 0 ? (
                <div style={{ textAlign: "center", padding: 24, color: "var(--text-muted)" }}>No reports yet</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {allReports.map((r: any) => (
                    <div key={r.id} style={{ padding: "10px 0", borderBottom: "1px solid var(--border)" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                        <span style={{ fontWeight: 500 }}>{r.salesUser?.name}</span>
                        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                          {r.location && <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{r.location}</span>}
                          <span style={{
                            fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 99,
                            background: r.status === "APPROVED" ? "rgba(22,163,74,0.1)" : r.status === "REJECTED" ? "rgba(220,38,38,0.1)" : "rgba(202,138,4,0.1)",
                            color: r.status === "APPROVED" ? "var(--green)" : r.status === "REJECTED" ? "var(--red)" : "var(--yellow)",
                          }}>{r.status}</span>
                        </div>
                      </div>
                      <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>{formatDate(r.createdAt)}</div>
                      <p style={{ fontSize: 13, margin: 0 }}>{r.summary}</p>
                      {r.bdComment && (
                        <div style={{ marginTop: 6, fontSize: 12, color: "var(--text-muted)", fontStyle: "italic" }}>
                          Comment: {r.bdComment}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </>
    );
  }

  // ─── Sales view: submit + view own reports ───────────────────────
  const today = new Date().toDateString();
  const submittedToday = reports.some((r) => new Date(r.createdAt).toDateString() === today);

  return (
    <>
      <div className="page-header">
        <h1>Daily Reports</h1>
      </div>

      {!submittedToday && (
        <div className="card" style={{ marginBottom: 20 }}>
          <h2 style={{ marginBottom: 12 }}>Submit Today's Report</h2>
          {msg.text && (
            <div className={`alert ${msg.ok ? "alert-success" : "alert-error"}`} style={{ marginBottom: 10 }}>{msg.text}</div>
          )}
          <form onSubmit={submitReport}>
            <div style={{ marginBottom: 10 }}>
              <label className="form-label">Summary *</label>
              <textarea className="input" rows={4} value={form.summary}
                onChange={(e) => setForm((f) => ({ ...f, summary: e.target.value }))}
                placeholder="What did you do today? Schools visited, outcomes, follow-ups needed…" />
            </div>
            <div style={{ marginBottom: 12 }}>
              <label className="form-label">Location</label>
              <input className="input" value={form.location}
                onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
                placeholder="City / Area" />
            </div>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? "Submitting…" : "Submit Report"}
            </button>
          </form>
        </div>
      )}

      {submittedToday && (
        <div className="alert alert-success" style={{ marginBottom: 16 }}>
          Report submitted for today.
        </div>
      )}

      <div className="card">
        <h2 style={{ marginBottom: 12 }}>My Reports</h2>
        {loading ? (
          <p style={{ color: "var(--text-muted)" }}>Loading…</p>
        ) : reports.length === 0 ? (
          <div style={{ textAlign: "center", padding: 24, color: "var(--text-muted)" }}>No reports yet</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {reports.map((r) => (
              <div key={r.id} style={{ padding: "10px 0", borderBottom: "1px solid var(--border)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{formatDate(r.createdAt)}</span>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    {r.location && <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{r.location}</span>}
                    <span style={{
                      fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 99,
                      background: r.status === "APPROVED" ? "rgba(22,163,74,0.1)" : r.status === "REJECTED" ? "rgba(220,38,38,0.1)" : "rgba(202,138,4,0.1)",
                      color: r.status === "APPROVED" ? "var(--green)" : r.status === "REJECTED" ? "var(--red)" : "var(--yellow)",
                    }}>{r.status}</span>
                  </div>
                </div>
                <p style={{ fontSize: 13, margin: 0 }}>{r.summary}</p>
                {r.bdComment && (
                  <div style={{ marginTop: 6, fontSize: 12, color: "var(--text-muted)", fontStyle: "italic" }}>
                    Comment: {r.bdComment}
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
