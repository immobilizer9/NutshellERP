"use client";

import { useEffect, useState } from "react";

const STATUS_BADGE: Record<string, string> = {
  SCHEDULED:  "badge-yellow",
  COMPLETED:  "badge-green",
  CANCELLED:  "badge-red",
};

export default function QuizSessionsPage() {
  const [sessions, setSessions] = useState<any[]>([]);
  const [schools,  setSchools]  = useState<any[]>([]);
  const [loading,  setLoading]  = useState(true);

  const [showSchedule, setShowSchedule] = useState(false);
  const [logId,        setLogId]        = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("");

  // Schedule form
  const [sForm, setSForm] = useState({ title: "", format: "IN_SCHOOL", schoolId: "", scheduledDate: "" });
  const [sSaving, setSSaving] = useState(false);

  // Log results form
  const [lForm, setLForm] = useState<any>({
    status: "COMPLETED",
    completedDate: "",
    participatingStudents: "",
    booksPitched: false,
    booksPitchedNotes: "",
    overallNotes: "",
    classResults: [] as any[],
    topPerformers: [] as any[],
  });
  const [lSaving, setLSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([
      fetch("/api/content/quiz-sessions", { credentials: "include" }).then((r) => r.json()),
      fetch("/api/bd/schools",            { credentials: "include" }).then((r) => r.json()),
    ]).then(([s, sc]) => {
      setSessions(Array.isArray(s) ? s : []);
      const schoolsList = Array.isArray(sc) ? sc : (sc.schools ?? []);
      setSchools(schoolsList);
    }).finally(() => setLoading(false));
  }, []);

  async function scheduleSession() {
    if (!sForm.title || !sForm.scheduledDate) { setError("Title and date are required"); return; }
    setSSaving(true);
    setError("");
    try {
      const res = await fetch("/api/content/quiz-sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ ...sForm, schoolId: sForm.schoolId || undefined }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Failed"); return; }
      setSessions((prev) => [data, ...prev]);
      setShowSchedule(false);
      setSForm({ title: "", format: "IN_SCHOOL", schoolId: "", scheduledDate: "" });
    } finally {
      setSSaving(false);
    }
  }

  function openLog(session: any) {
    setLogId(session.id);
    setLForm({
      status: "COMPLETED",
      completedDate: new Date().toISOString().slice(0, 16),
      participatingStudents: session.participatingStudents ?? "",
      booksPitched: session.booksPitched ?? false,
      booksPitchedNotes: session.booksPitchedNotes ?? "",
      overallNotes: session.overallNotes ?? "",
      classResults: session.classResults ?? [],
      topPerformers: session.topPerformers ?? [],
    });
  }

  async function saveLog() {
    if (!logId) return;
    setLSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/content/quiz-sessions?id=${logId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          ...lForm,
          participatingStudents: lForm.participatingStudents ? Number(lForm.participatingStudents) : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Failed"); return; }
      setSessions((prev) => prev.map((s) => (s.id === logId ? data : s)));
      setLogId(null);
    } finally {
      setLSaving(false);
    }
  }

  function addClassResult() {
    setLForm((p: any) => ({ ...p, classResults: [...p.classResults, { className: "", studentsPresent: "", averageScore: "", topScore: "", teacherFeedback: "" }] }));
  }
  function updateClassResult(i: number, field: string, val: string) {
    setLForm((p: any) => {
      const arr = [...p.classResults];
      arr[i] = { ...arr[i], [field]: val };
      return { ...p, classResults: arr };
    });
  }
  function removeClassResult(i: number) {
    setLForm((p: any) => ({ ...p, classResults: p.classResults.filter((_: any, idx: number) => idx !== i) }));
  }

  function addPerformer() {
    setLForm((p: any) => ({ ...p, topPerformers: [...p.topPerformers, { studentName: "", className: "", score: "", rank: "" }] }));
  }
  function updatePerformer(i: number, field: string, val: string) {
    setLForm((p: any) => {
      const arr = [...p.topPerformers];
      arr[i] = { ...arr[i], [field]: val };
      return { ...p, topPerformers: arr };
    });
  }
  function removePerformer(i: number) {
    setLForm((p: any) => ({ ...p, topPerformers: p.topPerformers.filter((_: any, idx: number) => idx !== i) }));
  }

  const filteredSessions = statusFilter ? sessions.filter((s) => s.status === statusFilter) : sessions;

  if (loading) return <div style={{ color: "var(--text-muted)", padding: "40px 0", textAlign: "center" }}>Loading...</div>;

  return (
    <>
      <div className="page-header">
        <h1>Quiz Sessions</h1>
        <p>Schedule and log results for quiz sessions.</p>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 16, alignItems: "center" }}>
        <button className="btn btn-primary" onClick={() => { setShowSchedule(true); setError(""); }}>+ Schedule Quiz</button>
        <select className="input" style={{ width: "auto" }} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">All Statuses</option>
          <option value="SCHEDULED">Scheduled</option>
          <option value="COMPLETED">Completed</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
      </div>

      {error && !showSchedule && !logId && (
        <p style={{ color: "var(--red)", fontSize: 13, marginBottom: 12 }}>{error}</p>
      )}

      {/* Schedule Modal */}
      {showSchedule && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div className="card" style={{ width: "100%", maxWidth: 480, maxHeight: "90vh", overflowY: "auto" }}>
            <h2 style={{ margin: "0 0 16px" }}>Schedule Quiz Session</h2>
            {error && <p style={{ color: "var(--red)", fontSize: 13, marginBottom: 10 }}>{error}</p>}
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <label className="form-label">Title *</label>
                <input className="input" value={sForm.title} onChange={(e) => setSForm((p) => ({ ...p, title: e.target.value }))} placeholder="e.g. Class 5 Annual Quiz" />
              </div>
              <div>
                <label className="form-label">Format *</label>
                <select className="input" value={sForm.format} onChange={(e) => setSForm((p) => ({ ...p, format: e.target.value }))}>
                  <option value="IN_SCHOOL">In-School</option>
                  <option value="INTER_SCHOOL">Inter-School</option>
                </select>
              </div>
              <div>
                <label className="form-label">School (optional)</label>
                <select className="input" value={sForm.schoolId} onChange={(e) => setSForm((p) => ({ ...p, schoolId: e.target.value }))}>
                  <option value="">No specific school</option>
                  {schools.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label className="form-label">Scheduled Date *</label>
                <input className="input" type="datetime-local" value={sForm.scheduledDate} onChange={(e) => setSForm((p) => ({ ...p, scheduledDate: e.target.value }))} />
              </div>
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                <button className="btn btn-ghost" onClick={() => setShowSchedule(false)}>Cancel</button>
                <button className="btn btn-primary" onClick={scheduleSession} disabled={sSaving}>{sSaving ? "Scheduling..." : "Schedule"}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Log Results Modal */}
      {logId && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 50, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: 20, overflowY: "auto" }}>
          <div className="card" style={{ width: "100%", maxWidth: 640, marginTop: 20 }}>
            <h2 style={{ margin: "0 0 16px" }}>Log Session Results</h2>
            {error && <p style={{ color: "var(--red)", fontSize: 13, marginBottom: 10 }}>{error}</p>}
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div>
                  <label className="form-label">Status</label>
                  <select className="input" value={lForm.status} onChange={(e) => setLForm((p: any) => ({ ...p, status: e.target.value }))}>
                    <option value="COMPLETED">Completed</option>
                    <option value="CANCELLED">Cancelled</option>
                  </select>
                </div>
                <div>
                  <label className="form-label">Completed Date</label>
                  <input className="input" type="datetime-local" value={lForm.completedDate} onChange={(e) => setLForm((p: any) => ({ ...p, completedDate: e.target.value }))} />
                </div>
              </div>
              <div>
                <label className="form-label">Participating Students</label>
                <input className="input" type="number" value={lForm.participatingStudents} onChange={(e) => setLForm((p: any) => ({ ...p, participatingStudents: e.target.value }))} />
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <input type="checkbox" id="bp" checked={lForm.booksPitched} onChange={(e) => setLForm((p: any) => ({ ...p, booksPitched: e.target.checked }))} />
                <label htmlFor="bp" style={{ fontSize: 14 }}>Books Pitched</label>
              </div>
              {lForm.booksPitched && (
                <input className="input" placeholder="Books pitched notes..." value={lForm.booksPitchedNotes} onChange={(e) => setLForm((p: any) => ({ ...p, booksPitchedNotes: e.target.value }))} />
              )}

              {/* Class Results */}
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <label className="form-label" style={{ margin: 0 }}>Class Results</label>
                  <button className="btn btn-ghost" style={{ fontSize: 12, padding: "3px 8px" }} onClick={addClassResult}>+ Add Class</button>
                </div>
                {lForm.classResults.map((r: any, i: number) => (
                  <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 80px 80px 80px 1fr auto", gap: 6, marginBottom: 6 }}>
                    <input className="input" placeholder="Class" value={r.className} onChange={(e) => updateClassResult(i, "className", e.target.value)} style={{ fontSize: 12 }} />
                    <input className="input" type="number" placeholder="Present" value={r.studentsPresent} onChange={(e) => updateClassResult(i, "studentsPresent", e.target.value)} style={{ fontSize: 12 }} />
                    <input className="input" type="number" placeholder="Avg %" value={r.averageScore} onChange={(e) => updateClassResult(i, "averageScore", e.target.value)} style={{ fontSize: 12 }} />
                    <input className="input" type="number" placeholder="Top %" value={r.topScore} onChange={(e) => updateClassResult(i, "topScore", e.target.value)} style={{ fontSize: 12 }} />
                    <input className="input" placeholder="Feedback" value={r.teacherFeedback} onChange={(e) => updateClassResult(i, "teacherFeedback", e.target.value)} style={{ fontSize: 12 }} />
                    <button className="btn btn-danger" style={{ fontSize: 11, padding: "2px 6px" }} onClick={() => removeClassResult(i)}>×</button>
                  </div>
                ))}
              </div>

              {/* Top Performers */}
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <label className="form-label" style={{ margin: 0 }}>Top Performers</label>
                  <button className="btn btn-ghost" style={{ fontSize: 12, padding: "3px 8px" }} onClick={addPerformer}>+ Add</button>
                </div>
                {lForm.topPerformers.map((p: any, i: number) => (
                  <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 80px 60px auto", gap: 6, marginBottom: 6 }}>
                    <input className="input" placeholder="Student name" value={p.studentName} onChange={(e) => updatePerformer(i, "studentName", e.target.value)} style={{ fontSize: 12 }} />
                    <input className="input" placeholder="Class" value={p.className} onChange={(e) => updatePerformer(i, "className", e.target.value)} style={{ fontSize: 12 }} />
                    <input className="input" type="number" placeholder="Score" value={p.score} onChange={(e) => updatePerformer(i, "score", e.target.value)} style={{ fontSize: 12 }} />
                    <input className="input" type="number" placeholder="Rank" value={p.rank} onChange={(e) => updatePerformer(i, "rank", e.target.value)} style={{ fontSize: 12 }} />
                    <button className="btn btn-danger" style={{ fontSize: 11, padding: "2px 6px" }} onClick={() => removePerformer(i)}>×</button>
                  </div>
                ))}
              </div>

              <div>
                <label className="form-label">Overall Notes</label>
                <textarea className="input" value={lForm.overallNotes} onChange={(e) => setLForm((p: any) => ({ ...p, overallNotes: e.target.value }))} style={{ height: 72, resize: "vertical" }} />
              </div>

              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                <button className="btn btn-ghost" onClick={() => setLogId(null)}>Cancel</button>
                <button className="btn btn-primary" onClick={saveLog} disabled={lSaving}>{lSaving ? "Saving..." : "Save Results"}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sessions table */}
      {filteredSessions.length === 0 ? (
        <div className="empty-state"><p>No quiz sessions found</p></div>
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Format</th>
                <th>School</th>
                <th>Date</th>
                <th>Status</th>
                <th>Trainers</th>
                <th>Students</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredSessions.map((s) => (
                <tr key={s.id}>
                  <td style={{ fontWeight: 500 }}>{s.title}</td>
                  <td><span className="badge badge-gray" style={{ fontSize: 11 }}>{s.format.replace("_", " ")}</span></td>
                  <td>{s.school?.name ?? "—"}</td>
                  <td style={{ fontSize: 13, color: "var(--text-muted)" }}>{new Date(s.scheduledDate).toLocaleDateString("en-IN")}</td>
                  <td><span className={`badge ${STATUS_BADGE[s.status] ?? "badge-gray"}`}>{s.status}</span></td>
                  <td>{s.trainers?.length ?? 0}</td>
                  <td>{s.participatingStudents ?? "—"}</td>
                  <td>
                    {s.status !== "CANCELLED" && (
                      <button className="btn btn-ghost" style={{ fontSize: 12, padding: "3px 8px" }} onClick={() => openLog(s)}>
                        Log Results
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
