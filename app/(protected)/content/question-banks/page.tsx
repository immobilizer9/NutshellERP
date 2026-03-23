"use client";

import { useEffect, useState } from "react";

const DIFF_BADGE: Record<string, string> = {
  EASY:   "badge-green",
  MEDIUM: "badge-yellow",
  HARD:   "badge-red",
};

const STATUS_BADGE: Record<string, string> = {
  DRAFT:     "badge-gray",
  PUBLISHED: "badge-green",
  ARCHIVED:  "badge-red",
};

const CORRECT_COLORS: Record<string, string> = {
  A: "var(--green)",
  B: "var(--green)",
  C: "var(--green)",
  D: "var(--green)",
};

export default function QuestionBanksPage() {
  const [banks,    setBanks]    = useState<any[]>([]);
  const [questions, setQuestions] = useState<any[]>([]);
  const [selected,  setSelected]  = useState<any>(null);
  const [loading,   setLoading]   = useState(true);

  // Modals
  const [showNewBank, setShowNewBank] = useState(false);
  const [showNewQ,    setShowNewQ]    = useState(false);

  // New bank form
  const [bankForm, setBankForm] = useState({ title: "", description: "", subject: "GK", classFrom: "1", classTo: "10", difficulty: "MEDIUM" });
  const [bankSaving, setBankSaving] = useState(false);

  // New question form
  const [qForm, setQForm] = useState({ text: "", optionA: "", optionB: "", optionC: "", optionD: "", correctOption: "A", explanation: "", classLevel: "", difficulty: "MEDIUM" });
  const [qSaving, setQSaving] = useState(false);

  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/content/question-banks", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setBanks(Array.isArray(d) ? d : []))
      .finally(() => setLoading(false));
  }, []);

  function selectBank(bank: any) {
    setSelected(bank);
    setQuestions([]);
    setShowNewQ(false);
    fetch(`/api/content/questions?bankId=${bank.id}`, { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setQuestions(Array.isArray(d) ? d : []));
  }

  async function createBank() {
    if (!bankForm.title) { setError("Title is required"); return; }
    setBankSaving(true);
    setError("");
    try {
      const res = await fetch("/api/content/question-banks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ ...bankForm, classFrom: Number(bankForm.classFrom), classTo: Number(bankForm.classTo) }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Failed"); return; }
      setBanks((prev) => [data, ...prev]);
      setShowNewBank(false);
      setBankForm({ title: "", description: "", subject: "GK", classFrom: "1", classTo: "10", difficulty: "MEDIUM" });
    } finally {
      setBankSaving(false);
    }
  }

  async function createQuestion() {
    if (!qForm.text || !qForm.optionA || !qForm.optionB || !qForm.optionC || !qForm.optionD) {
      setError("All question fields are required");
      return;
    }
    setQSaving(true);
    setError("");
    try {
      const res = await fetch("/api/content/questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          bankId: selected.id,
          ...qForm,
          classLevel: qForm.classLevel ? Number(qForm.classLevel) : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Failed"); return; }
      setQuestions((prev) => [...prev, data]);
      setBanks((prev) => prev.map((b) => b.id === selected.id ? { ...b, _count: { questions: (b._count?.questions ?? 0) + 1 } } : b));
      setShowNewQ(false);
      setQForm({ text: "", optionA: "", optionB: "", optionC: "", optionD: "", correctOption: "A", explanation: "", classLevel: "", difficulty: "MEDIUM" });
    } finally {
      setQSaving(false);
    }
  }

  async function deleteQuestion(qId: string) {
    if (!confirm("Delete this question?")) return;
    const res = await fetch(`/api/content/questions?id=${qId}`, { method: "DELETE", credentials: "include" });
    if (res.ok) {
      setQuestions((prev) => prev.filter((q) => q.id !== qId));
      setBanks((prev) => prev.map((b) => b.id === selected?.id ? { ...b, _count: { questions: Math.max(0, (b._count?.questions ?? 1) - 1) } } : b));
    }
  }

  if (loading) return <p style={{ color: "var(--text-muted)" }}>Loading...</p>;

  return (
    <>
      <div className="page-header">
        <h1>Question Banks</h1>
        <p>Manage quiz question banks and individual questions.</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "300px 1fr", gap: 20 }}>

        {/* Left: Banks list */}
        <div>
          <button className="btn btn-primary" style={{ width: "100%", marginBottom: 12 }} onClick={() => { setShowNewBank(true); setError(""); }}>
            + New Bank
          </button>

          {showNewBank && (
            <div className="card" style={{ padding: 14, marginBottom: 12 }}>
              <h3 style={{ margin: "0 0 12px", fontSize: 14 }}>New Question Bank</h3>
              {error && <p style={{ color: "var(--red)", fontSize: 13, marginBottom: 8 }}>{error}</p>}
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <input className="input" placeholder="Title *" value={bankForm.title} onChange={(e) => setBankForm((p) => ({ ...p, title: e.target.value }))} />
                <input className="input" placeholder="Subject (e.g. GK)" value={bankForm.subject} onChange={(e) => setBankForm((p) => ({ ...p, subject: e.target.value }))} />
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                  <input className="input" type="number" placeholder="Class From" value={bankForm.classFrom} onChange={(e) => setBankForm((p) => ({ ...p, classFrom: e.target.value }))} />
                  <input className="input" type="number" placeholder="Class To" value={bankForm.classTo} onChange={(e) => setBankForm((p) => ({ ...p, classTo: e.target.value }))} />
                </div>
                <select className="input" value={bankForm.difficulty} onChange={(e) => setBankForm((p) => ({ ...p, difficulty: e.target.value }))}>
                  <option value="EASY">Easy</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HARD">Hard</option>
                </select>
                <div style={{ display: "flex", gap: 6 }}>
                  <button className="btn btn-primary" onClick={createBank} disabled={bankSaving} style={{ flex: 1 }}>{bankSaving ? "Creating..." : "Create"}</button>
                  <button className="btn btn-ghost" onClick={() => setShowNewBank(false)}>Cancel</button>
                </div>
              </div>
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {banks.length === 0 ? (
              <div className="empty-state"><p>No question banks yet</p></div>
            ) : (
              banks.map((b) => (
                <div
                  key={b.id}
                  onClick={() => selectBank(b)}
                  className="card"
                  style={{
                    cursor: "pointer",
                    padding: "12px 14px",
                    border: selected?.id === b.id ? "2px solid var(--accent)" : "1px solid var(--border)",
                  }}
                >
                  <p style={{ fontWeight: 600, margin: "0 0 4px", fontSize: 13 }}>{b.title}</p>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    <span className="badge badge-gray" style={{ fontSize: 11 }}>{b.subject}</span>
                    <span className="badge badge-gray" style={{ fontSize: 11 }}>Cls {b.classFrom}–{b.classTo}</span>
                    <span className={`badge ${DIFF_BADGE[b.difficulty] ?? "badge-gray"}`} style={{ fontSize: 11 }}>{b.difficulty}</span>
                    <span className={`badge ${STATUS_BADGE[b.status] ?? "badge-gray"}`} style={{ fontSize: 11 }}>{b.status}</span>
                  </div>
                  <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "4px 0 0" }}>{b._count?.questions ?? 0} questions</p>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right: Questions panel */}
        <div className="card">
          {!selected ? (
            <div className="empty-state"><p>Select a question bank to view questions</p></div>
          ) : (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <div>
                  <h2 style={{ margin: 0 }}>{selected.title}</h2>
                  <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "4px 0 0" }}>
                    {selected.subject} · Class {selected.classFrom}–{selected.classTo} · {questions.length} questions
                  </p>
                </div>
                <button className="btn btn-primary" onClick={() => { setShowNewQ(true); setError(""); }}>+ Add Question</button>
              </div>

              {error && <p style={{ color: "var(--red)", fontSize: 13, marginBottom: 12 }}>{error}</p>}

              {/* Add Question Modal */}
              {showNewQ && (
                <div style={{ background: "var(--bg)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: 16, marginBottom: 20 }}>
                  <h3 style={{ margin: "0 0 14px", fontSize: 14 }}>Add Question</h3>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    <textarea className="input" placeholder="Question text *" value={qForm.text} onChange={(e) => setQForm((p) => ({ ...p, text: e.target.value }))} style={{ height: 72, resize: "vertical" }} />
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                      <input className="input" placeholder="Option A *" value={qForm.optionA} onChange={(e) => setQForm((p) => ({ ...p, optionA: e.target.value }))} />
                      <input className="input" placeholder="Option B *" value={qForm.optionB} onChange={(e) => setQForm((p) => ({ ...p, optionB: e.target.value }))} />
                      <input className="input" placeholder="Option C *" value={qForm.optionC} onChange={(e) => setQForm((p) => ({ ...p, optionC: e.target.value }))} />
                      <input className="input" placeholder="Option D *" value={qForm.optionD} onChange={(e) => setQForm((p) => ({ ...p, optionD: e.target.value }))} />
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                      <div>
                        <label className="form-label" style={{ fontSize: 12 }}>Correct Answer *</label>
                        <select className="input" value={qForm.correctOption} onChange={(e) => setQForm((p) => ({ ...p, correctOption: e.target.value }))}>
                          <option value="A">A</option>
                          <option value="B">B</option>
                          <option value="C">C</option>
                          <option value="D">D</option>
                        </select>
                      </div>
                      <div>
                        <label className="form-label" style={{ fontSize: 12 }}>Difficulty</label>
                        <select className="input" value={qForm.difficulty} onChange={(e) => setQForm((p) => ({ ...p, difficulty: e.target.value }))}>
                          <option value="EASY">Easy</option>
                          <option value="MEDIUM">Medium</option>
                          <option value="HARD">Hard</option>
                        </select>
                      </div>
                      <div>
                        <label className="form-label" style={{ fontSize: 12 }}>Class Level</label>
                        <input className="input" type="number" placeholder="e.g. 5" value={qForm.classLevel} onChange={(e) => setQForm((p) => ({ ...p, classLevel: e.target.value }))} />
                      </div>
                    </div>
                    <textarea className="input" placeholder="Explanation (optional)" value={qForm.explanation} onChange={(e) => setQForm((p) => ({ ...p, explanation: e.target.value }))} style={{ height: 56, resize: "vertical" }} />
                    <div style={{ display: "flex", gap: 8 }}>
                      <button className="btn btn-primary" onClick={createQuestion} disabled={qSaving}>{qSaving ? "Adding..." : "Add Question"}</button>
                      <button className="btn btn-ghost" onClick={() => setShowNewQ(false)}>Cancel</button>
                    </div>
                  </div>
                </div>
              )}

              {/* Questions list */}
              {questions.length === 0 ? (
                <div className="empty-state"><p>No questions yet. Add one above.</p></div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {questions.map((q, i) => (
                    <div key={q.id} style={{ background: "var(--bg)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "14px 16px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                        <p style={{ fontWeight: 500, margin: 0, fontSize: 14, flex: 1, marginRight: 12 }}>
                          <span style={{ color: "var(--text-muted)", marginRight: 6, fontSize: 12 }}>Q{i + 1}.</span>
                          {q.text}
                        </p>
                        <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                          <span className={`badge ${DIFF_BADGE[q.difficulty] ?? "badge-gray"}`} style={{ fontSize: 11 }}>{q.difficulty}</span>
                          {q.classLevel && <span className="badge badge-gray" style={{ fontSize: 11 }}>Cls {q.classLevel}</span>}
                          <button onClick={() => deleteQuestion(q.id)} className="btn btn-danger" style={{ fontSize: 11, padding: "2px 8px" }}>Delete</button>
                        </div>
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                        {(["A", "B", "C", "D"] as const).map((opt) => {
                          const text = q[`option${opt}` as keyof typeof q] as string;
                          const isCorrect = q.correctOption === opt;
                          return (
                            <div key={opt} style={{
                              padding: "6px 10px",
                              borderRadius: "var(--radius)",
                              border: `1px solid ${isCorrect ? "var(--green)" : "var(--border)"}`,
                              background: isCorrect ? "rgba(34,197,94,0.08)" : "var(--surface)",
                              fontSize: 13,
                            }}>
                              <span style={{ fontWeight: 700, color: isCorrect ? "var(--green)" : "var(--text-muted)", marginRight: 6 }}>{opt}.</span>
                              {text}
                            </div>
                          );
                        })}
                      </div>
                      {q.explanation && (
                        <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "8px 0 0", fontStyle: "italic" }}>
                          Explanation: {q.explanation}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

      </div>
    </>
  );
}
