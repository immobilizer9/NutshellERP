"use client";

import { useEffect, useMemo, useState } from "react";

export default function CompetitorDashboard() {
  const [notes, setNotes]     = useState<any[]>([]);
  const [schools, setSchools] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Form
  const [form, setForm] = useState({
    schoolId:   "",
    competitor: "",
    notes:      "",
    isActive:   true,
  });
  const [msg, setMsg]         = useState({ text: "", ok: false });
  const [submitting, setSubmitting] = useState(false);

  // Filters
  const [searchSchool, setSearchSchool]   = useState("");
  const [filterActive, setFilterActive]   = useState("ALL");
  const [filterComp,   setFilterComp]     = useState("");

  const fetchAll = async () => {
    setLoading(true);
    const [notesRes, schoolsRes] = await Promise.all([
      fetch("/api/competitors",  { credentials: "include" }).then((r) => r.json()),
      fetch("/api/bd/schools",   { credentials: "include" }).then((r) => r.json()),
    ]);
    setNotes(Array.isArray(notesRes)     ? notesRes   : []);
    setSchools(Array.isArray(schoolsRes) ? schoolsRes : []);
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.schoolId || !form.competitor.trim()) {
      setMsg({ text: "School and competitor name are required.", ok: false });
      return;
    }
    setSubmitting(true);
    setMsg({ text: "", ok: false });
    try {
      const res  = await fetch("/api/competitors", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setMsg({ text: "Competitor note saved!", ok: true });
      setForm({ schoolId: "", competitor: "", notes: "", isActive: true });
      await fetchAll();
    } catch (err: any) {
      setMsg({ text: err.message, ok: false });
    } finally {
      setSubmitting(false);
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this competitor note?")) return;
    await fetch(`/api/competitors?id=${id}`, { method: "DELETE", credentials: "include" });
    await fetchAll();
  };

  // Competitor summary across all schools
  const competitorSummary = useMemo(() => {
    const map: Record<string, { total: number; active: number; schools: Set<string> }> = {};
    for (const n of notes) {
      if (!map[n.competitor]) map[n.competitor] = { total: 0, active: 0, schools: new Set() };
      map[n.competitor].total++;
      if (n.isActive) map[n.competitor].active++;
      map[n.competitor].schools.add(n.schoolId);
    }
    return Object.entries(map)
      .map(([name, v]) => ({ name, total: v.total, active: v.active, schools: v.schools.size }))
      .sort((a, b) => b.active - a.active);
  }, [notes]);

  const filtered = useMemo(() => {
    let r = [...notes];
    if (searchSchool) {
      const q = searchSchool.toLowerCase();
      r = r.filter((n) => n.school?.name?.toLowerCase().includes(q));
    }
    if (filterActive !== "ALL") r = r.filter((n) => n.isActive === (filterActive === "ACTIVE"));
    if (filterComp)   r = r.filter((n) => n.competitor.toLowerCase().includes(filterComp.toLowerCase()));
    return r;
  }, [notes, searchSchool, filterActive, filterComp]);

  const uniqueCompetitors = [...new Set(notes.map((n) => n.competitor))].sort();

  return (
    <>
      <div className="page-header">
        <h1>Competitor Intelligence</h1>
        <p>Track which competitors are present at each school</p>
      </div>

      {/* ── Competitor Summary ── */}
      {competitorSummary.length > 0 && (
        <div className="card" style={{ marginBottom: 16 }}>
          <h2 style={{ marginBottom: 14 }}>Competitor Overview</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 10 }}>
            {competitorSummary.map((c) => (
              <div key={c.name} style={{ background: "var(--bg)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", padding: "12px 14px" }}>
                <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>{c.name}</div>
                <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Active at {c.active} school{c.active !== 1 ? "s" : ""}</div>
                <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{c.schools} unique school{c.schools !== 1 ? "s" : ""}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.6fr", gap: 16, marginBottom: 16 }}>

        {/* ── Add Note Form ── */}
        <div className="card">
          <h2 style={{ marginBottom: 16 }}>Log Competitor</h2>
          <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div>
              <label style={{ fontSize: 12, color: "var(--text-muted)", display: "block", marginBottom: 4 }}>School</label>
              <select className="input" value={form.schoolId}
                onChange={(e) => setForm((f) => ({ ...f, schoolId: e.target.value }))}>
                <option value="">Select school…</option>
                {schools.map((s: any) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 12, color: "var(--text-muted)", display: "block", marginBottom: 4 }}>Competitor Name</label>
              <input className="input" placeholder="e.g. Oxford, S.Chand, NavNeet…"
                value={form.competitor}
                onChange={(e) => setForm((f) => ({ ...f, competitor: e.target.value }))} />
            </div>
            <div>
              <label style={{ fontSize: 12, color: "var(--text-muted)", display: "block", marginBottom: 4 }}>Notes (optional)</label>
              <textarea className="input" rows={3} placeholder="Any observations…"
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                style={{ resize: "vertical" }} />
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <input type="checkbox" id="isActive" checked={form.isActive}
                onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
                style={{ accentColor: "var(--accent)" }} />
              <label htmlFor="isActive" style={{ fontSize: 13 }}>Currently active at this school</label>
            </div>
            {msg.text && (
              <div style={{ padding: "8px 12px", borderRadius: "var(--radius)", fontSize: 13,
                background: msg.ok ? "var(--green-soft, #dcfce7)" : "var(--red-soft, #fee2e2)",
                color: msg.ok ? "var(--green, #16a34a)" : "var(--red, #dc2626)" }}>
                {msg.text}
              </div>
            )}
            <button className="btn btn-primary" type="submit" disabled={submitting}>
              {submitting ? "Saving…" : "Save Note"}
            </button>
          </form>
        </div>

        {/* ── Notes List ── */}
        <div className="card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <h2 style={{ margin: 0 }}>Notes ({filtered.length})</h2>
          </div>
          <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
            <input className="input" placeholder="Search school…" value={searchSchool}
              onChange={(e) => setSearchSchool(e.target.value)} style={{ flex: 1, minWidth: 140 }} />
            <select className="input" value={filterComp}
              onChange={(e) => setFilterComp(e.target.value)} style={{ width: 140 }}>
              <option value="">All competitors</option>
              {uniqueCompetitors.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <select className="input" value={filterActive}
              onChange={(e) => setFilterActive(e.target.value)} style={{ width: 110 }}>
              <option value="ALL">All</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </select>
          </div>

          {loading ? (
            <div style={{ color: "var(--text-muted)", padding: "40px 0", textAlign: "center" }}>Loading...</div>
          ) : filtered.length === 0 ? (
            <div className="empty-state"><p>No competitor notes found</p></div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 480, overflowY: "auto" }}>
              {filtered.map((note) => (
                <div key={note.id} style={{ background: "var(--bg)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", padding: "10px 14px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div>
                      <span style={{ fontWeight: 600, fontSize: 13.5 }}>{note.competitor}</span>
                      <span style={{ marginLeft: 8 }}>
                        <span className={`badge ${note.isActive ? "badge-green" : "badge-gray"}`} style={{ fontSize: 10 }}>
                          {note.isActive ? "Active" : "Inactive"}
                        </span>
                      </span>
                      <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>{note.school?.name}</div>
                    </div>
                    <button className="btn btn-ghost" style={{ fontSize: 11, padding: "2px 8px", color: "var(--red)" }}
                      onClick={() => remove(note.id)}>
                      Delete
                    </button>
                  </div>
                  {note.notes && (
                    <p style={{ fontSize: 12, color: "var(--text-secondary)", margin: "6px 0 0" }}>{note.notes}</p>
                  )}
                  <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 6 }}>
                    By {note.createdBy?.name} · {new Date(note.createdAt).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
