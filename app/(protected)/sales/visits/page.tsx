"use client";

import { useEffect, useState, useMemo } from "react";
import Badge from "@/app/components/Badge";

const OUTCOMES = ["INTERESTED", "FOLLOW_UP", "NOT_INTERESTED", "ORDER_PLACED"] as const;
type Outcome = typeof OUTCOMES[number];

export default function VisitLogPage() {
  const [schools, setSchools]   = useState<any[]>([]);
  const [visits, setVisits]     = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg]           = useState({ text: "", ok: false });
  const [outcomeFilter, setOutcomeFilter] = useState<string>("ALL");

  const [form, setForm] = useState({
    schoolId:      "",
    outcome:       "" as Outcome | "",
    notes:         "",
    nextVisitDate: "",
  });

  const fetchVisits = async () => {
    const res = await fetch("/api/visits", { credentials: "include" });
    const data = await res.json();
    setVisits(Array.isArray(data) ? data : []);
  };

  const fetchSchools = async () => {
    const res = await fetch("/api/bd/schools", { credentials: "include" });
    const data = await res.json();
    setSchools(Array.isArray(data) ? data : []);
  };

  useEffect(() => {
    Promise.all([fetchSchools(), fetchVisits()]).finally(() => setLoading(false));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.schoolId || !form.outcome) {
      setMsg({ text: "School and outcome are required.", ok: false });
      return;
    }
    setSubmitting(true);
    setMsg({ text: "", ok: false });
    try {
      const res = await fetch("/api/visits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          schoolId:      form.schoolId,
          outcome:       form.outcome,
          notes:         form.notes || undefined,
          nextVisitDate: form.nextVisitDate || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to log visit");
      setMsg({ text: "Visit logged successfully.", ok: true });
      setForm({ schoolId: "", outcome: "", notes: "", nextVisitDate: "" });
      await fetchVisits();
    } catch (err: any) {
      setMsg({ text: err.message, ok: false });
    } finally {
      setSubmitting(false);
    }
  };

  const filteredVisits = useMemo(() =>
    outcomeFilter === "ALL"
      ? visits
      : visits.filter((v) => v.outcome === outcomeFilter),
    [visits, outcomeFilter]);

  return (
    <>
      <div className="page-header">
        <h1>Visit Log</h1>
        <p>Log school visits and track follow-ups</p>
      </div>

      {/* Log a Visit */}
      <div className="card" style={{ marginBottom: 20 }}>
        <h2 style={{ marginBottom: 14 }}>Log a Visit</h2>
        <form onSubmit={handleSubmit}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
            <div>
              <label className="form-label">School *</label>
              <select
                className="input"
                value={form.schoolId}
                onChange={(e) => setForm((f) => ({ ...f, schoolId: e.target.value }))}
                required
              >
                <option value="">Select school...</option>
                {schools.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="form-label">Outcome *</label>
              <select
                className="input"
                value={form.outcome}
                onChange={(e) => setForm((f) => ({ ...f, outcome: e.target.value as Outcome }))}
                required
              >
                <option value="">Select outcome...</option>
                {OUTCOMES.map((o) => (
                  <option key={o} value={o}>{o.replaceAll("_", " ")}</option>
                ))}
              </select>
            </div>
            <div style={{ gridColumn: "1 / -1" }}>
              <label className="form-label">Notes</label>
              <textarea
                className="input"
                rows={3}
                placeholder="Any notes about this visit..."
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                style={{ resize: "vertical" }}
              />
            </div>
            <div>
              <label className="form-label">Next Visit Date</label>
              <input
                className="input"
                type="date"
                value={form.nextVisitDate}
                onChange={(e) => setForm((f) => ({ ...f, nextVisitDate: e.target.value }))}
              />
            </div>
          </div>

          {msg.text && (
            <div style={{
              padding: "10px 14px", borderRadius: "var(--radius)", marginBottom: 12,
              background: msg.ok ? "color-mix(in srgb, var(--green) 12%, transparent)" : "color-mix(in srgb, var(--red) 12%, transparent)",
              color: msg.ok ? "var(--green)" : "var(--red)",
              fontSize: 13, border: `1px solid ${msg.ok ? "var(--green)" : "var(--red)"}`,
            }}>
              {msg.text}
            </div>
          )}

          <button className="btn btn-primary" type="submit" disabled={submitting}>
            {submitting ? "Logging..." : "Log Visit"}
          </button>
        </form>
      </div>

      {/* Visit History */}
      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, flexWrap: "wrap", gap: 10 }}>
          <h2 style={{ margin: 0 }}>Visit History</h2>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {["ALL", ...OUTCOMES].map((o) => (
              <button
                key={o}
                className={outcomeFilter === o ? "btn btn-primary" : "btn btn-ghost"}
                style={{ fontSize: 12, padding: "4px 10px" }}
                onClick={() => setOutcomeFilter(o)}
              >
                {o === "ALL" ? "All" : o.replaceAll("_", " ")}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <p style={{ color: "var(--text-muted)", fontSize: 13 }}>Loading...</p>
        ) : filteredVisits.length === 0 ? (
          <div className="empty-state">
            <p>No visits logged yet</p>
            <p>Use the form above to log your first visit</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>School</th>
                  <th>Outcome</th>
                  <th>Notes</th>
                  <th>Next Visit</th>
                  <th>Date Logged</th>
                </tr>
              </thead>
              <tbody>
                {filteredVisits.map((visit) => (
                  <tr key={visit.id}>
                    <td style={{ fontWeight: 500 }}>
                      <a
                        href={`/bd/schools/${visit.schoolId}`}
                        style={{ color: "var(--accent)", textDecoration: "none" }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        {visit.school?.name ?? visit.schoolId}
                      </a>
                    </td>
                    <td><Badge status={visit.outcome} /></td>
                    <td style={{ color: "var(--text-secondary)", fontSize: 13 }}>
                      {visit.notes
                        ? visit.notes.length > 60
                          ? visit.notes.slice(0, 60) + "…"
                          : visit.notes
                        : <span style={{ color: "var(--text-muted)" }}>—</span>}
                    </td>
                    <td style={{ color: "var(--text-muted)", fontSize: 12.5 }}>
                      {visit.nextVisitDate
                        ? new Date(visit.nextVisitDate).toLocaleDateString()
                        : <span style={{ color: "var(--text-muted)" }}>—</span>}
                    </td>
                    <td style={{ color: "var(--text-muted)", fontSize: 12.5 }}>
                      {new Date(visit.createdAt).toLocaleDateString()}
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
