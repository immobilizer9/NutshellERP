"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const STATUS_BADGE: Record<string, string> = {
  OPEN:        "badge-blue",
  IN_PROGRESS: "badge-yellow",
  COMPLETED:   "badge-green",
  DRAFT:       "badge-gray",
  SUBMITTED:   "badge-yellow",
  APPROVED:    "badge-green",
  REJECTED:    "badge-red",
  DESIGN_SENT: "badge-indigo",
  PUBLISHED:   "badge-blue",
};

const PRODUCT_LABELS: Record<string, string> = {
  ANNUAL:              "Annual",
  PAPERBACKS_PLAINS:   "Plains",
  PAPERBACKS_HILLS:    "Hills",
  NUTSHELL_ANNUAL:     "Nutshell Annual",
  NUTSHELL_PAPERBACKS: "Nutshell PB",
  ONLINE:              "Online",
};

const PRODUCT_TYPES = Object.entries(PRODUCT_LABELS);
const BOOKS = [1, 2, 3, 4] as const;
const CURRENT_YEAR = new Date().getFullYear();
const YEARS = [CURRENT_YEAR - 1, CURRENT_YEAR, CURRENT_YEAR + 1];

function formatDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

const BLANK_FORM = {
  title: "", description: "", productType: "PAPERBACKS_PLAINS",
  classFrom: "1", classTo: "5", assignedToId: "", dueDate: "",
  bookNumber: "", year: String(CURRENT_YEAR),
};

// ─── Admin view ───────────────────────────────────────────────────────────────
function AdminTopicsPage() {
  const [topics,       setTopics]       = useState<any[]>([]);
  const [users,        setUsers]        = useState<any[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [form,         setForm]         = useState({ ...BLANK_FORM });
  const [editId,       setEditId]       = useState<string | null>(null);
  const [submitting,   setSubmitting]   = useState(false);
  const [msg,          setMsg]          = useState({ text: "", ok: false });
  const [filterBook,   setFilterBook]   = useState<string>("ALL");
  const [filterYear,   setFilterYear]   = useState<string>(String(CURRENT_YEAR));
  const [filterStatus, setFilterStatus] = useState("ALL");

  const fetchTopics = () =>
    fetch("/api/content/topics", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setTopics(Array.isArray(d) ? d : []));

  useEffect(() => {
    Promise.all([
      fetchTopics(),
      fetch("/api/admin/users", { credentials: "include" })
        .then((r) => r.json())
        .then((d) => {
          if (Array.isArray(d)) {
            setUsers(d.filter((u: any) =>
              u.roles?.some((r: any) => ["CONTENT_TEAM", "TRAINER"].includes(r.role?.name))
            ));
          }
        }),
    ]).finally(() => setLoading(false));
  }, []);

  const submit = async () => {
    if (!form.title.trim() || !form.assignedToId) {
      setMsg({ text: "Title and assignee are required.", ok: false }); return;
    }
    setSubmitting(true); setMsg({ text: "", ok: false });
    try {
      const method = editId ? "PATCH" : "POST";
      const body   = editId ? { id: editId, ...form } : form;
      const res = await fetch("/api/content/topics", {
        method, headers: { "Content-Type": "application/json" },
        credentials: "include", body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setMsg({ text: editId ? "Topic updated." : "Topic created and assigned.", ok: true });
      setForm({ ...BLANK_FORM });
      setEditId(null);
      await fetchTopics();
    } catch (err: any) {
      setMsg({ text: err.message, ok: false });
    } finally {
      setSubmitting(false);
    }
  };

  const startEdit = (t: any) => {
    setEditId(t.id);
    setForm({
      title:        t.title,
      description:  t.description ?? "",
      productType:  t.productType,
      classFrom:    String(t.classFrom),
      classTo:      String(t.classTo),
      assignedToId: t.assignedTo?.id ?? "",
      dueDate:      t.dueDate ? t.dueDate.slice(0, 10) : "",
      bookNumber:   t.bookNumber != null ? String(t.bookNumber) : "",
      year:         t.year      != null ? String(t.year)       : String(CURRENT_YEAR),
    });
    setMsg({ text: "", ok: false });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const cancelEdit = () => { setEditId(null); setForm({ ...BLANK_FORM }); setMsg({ text: "", ok: false }); };

  // Filter
  const filtered = topics.filter((t) => {
    if (filterYear !== "ALL" && String(t.year ?? CURRENT_YEAR) !== filterYear) return false;
    if (filterBook !== "ALL") {
      const b = filterBook === "NONE" ? !t.bookNumber : String(t.bookNumber) === filterBook;
      if (!b) return false;
    }
    if (filterStatus !== "ALL" && t.status !== filterStatus) return false;
    return true;
  });

  // Group by book for display
  const grouped = BOOKS.reduce((acc, b) => {
    acc[b] = filtered.filter((t) => t.bookNumber === b);
    return acc;
  }, {} as Record<number, any[]>);
  const unassigned = filtered.filter((t) => !t.bookNumber);

  // Available years in topics
  const topicYears = [...new Set(topics.map((t) => t.year ?? CURRENT_YEAR))].sort();

  if (loading) return <p style={{ color: "var(--text-muted)" }}>Loading...</p>;

  return (
    <>
      <div className="page-header">
        <h1>Content Topics</h1>
        <p>Organise content by Book (published 4× per year) and assign to team members.</p>
      </div>

      {/* Create / Edit form */}
      <div className="card" style={{ marginBottom: 24 }}>
        <h2 style={{ marginBottom: 16 }}>{editId ? "Edit Topic" : "Create & Assign Topic"}</h2>

        {msg.text && (
          <div className={`alert ${msg.ok ? "alert-success" : "alert-error"}`} style={{ marginBottom: 14 }}>
            {msg.text}
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div style={{ gridColumn: "1 / -1" }}>
            <label className="form-label">Title *</label>
            <input className="input" value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="e.g. Chapter 5 – Solar System (Class 5 Plains)" />
          </div>

          <div style={{ gridColumn: "1 / -1" }}>
            <label className="form-label">Description <span style={{ color: "var(--text-muted)" }}>(optional)</span></label>
            <textarea className="input" rows={2} value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Brief notes for the assignee…" />
          </div>

          <div>
            <label className="form-label">Product Type *</label>
            <select className="input" value={form.productType}
              onChange={(e) => setForm((f) => ({ ...f, productType: e.target.value }))}>
              {PRODUCT_TYPES.map(([val, label]) => (
                <option key={val} value={val}>{label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="form-label">Assign To *</label>
            <select className="input" value={form.assignedToId}
              onChange={(e) => setForm((f) => ({ ...f, assignedToId: e.target.value }))}>
              <option value="">Select team member…</option>
              {users.map((u: any) => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
          </div>

          {/* Book + Year */}
          <div>
            <label className="form-label">Book Number <span style={{ color: "var(--text-muted)" }}>(paperback only)</span></label>
            <select className="input" value={form.bookNumber}
              onChange={(e) => setForm((f) => ({ ...f, bookNumber: e.target.value }))}>
              <option value="">— Not assigned —</option>
              {BOOKS.map((b) => <option key={b} value={String(b)}>Book {b}</option>)}
            </select>
          </div>

          <div>
            <label className="form-label">Year *</label>
            <select className="input" value={form.year}
              onChange={(e) => setForm((f) => ({ ...f, year: e.target.value }))}>
              {YEARS.map((y) => <option key={y} value={String(y)}>{y}</option>)}
            </select>
          </div>

          <div>
            <label className="form-label">Class Range *</label>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input className="input" type="number" min={1} max={12} value={form.classFrom}
                onChange={(e) => setForm((f) => ({ ...f, classFrom: e.target.value }))}
                placeholder="From" style={{ width: 80 }} />
              <span style={{ color: "var(--text-muted)" }}>to</span>
              <input className="input" type="number" min={1} max={12} value={form.classTo}
                onChange={(e) => setForm((f) => ({ ...f, classTo: e.target.value }))}
                placeholder="To" style={{ width: 80 }} />
            </div>
          </div>

          <div>
            <label className="form-label">Due Date <span style={{ color: "var(--text-muted)" }}>(optional)</span></label>
            <input className="input" type="date" value={form.dueDate}
              onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))} />
          </div>
        </div>

        <div style={{ marginTop: 16, display: "flex", gap: 8 }}>
          <button className="btn btn-primary" onClick={submit} disabled={submitting}>
            {submitting ? (editId ? "Saving…" : "Creating…") : (editId ? "Save Changes" : "Create & Assign")}
          </button>
          {editId && <button className="btn" onClick={cancelEdit}>Cancel</button>}
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
        <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Year:</span>
        {["ALL", ...topicYears.map(String)].map((y) => (
          <button key={y} className="btn" style={{ fontSize: 12, background: filterYear === y ? "var(--accent)" : undefined, color: filterYear === y ? "#fff" : undefined }}
            onClick={() => setFilterYear(y)}>{y === "ALL" ? "All Years" : y}</button>
        ))}
        <span style={{ width: 1, height: 20, background: "var(--border)", margin: "0 4px" }} />
        <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Book:</span>
        {["ALL", "1", "2", "3", "4", "NONE"].map((b) => (
          <button key={b} className="btn" style={{ fontSize: 12, background: filterBook === b ? "var(--accent)" : undefined, color: filterBook === b ? "#fff" : undefined }}
            onClick={() => setFilterBook(b)}>
            {b === "ALL" ? "All Books" : b === "NONE" ? "Unassigned" : `Book ${b}`}
          </button>
        ))}
        <span style={{ width: 1, height: 20, background: "var(--border)", margin: "0 4px" }} />
        {["ALL", "OPEN", "IN_PROGRESS", "COMPLETED"].map((s) => (
          <button key={s} className="btn" style={{ fontSize: 12, background: filterStatus === s ? "var(--accent)" : undefined, color: filterStatus === s ? "#fff" : undefined }}
            onClick={() => setFilterStatus(s)}>
            {s === "ALL" ? "All Status" : s.replace("_", " ")}
          </button>
        ))}
      </div>

      {/* Grouped book view */}
      {filtered.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: 40, color: "var(--text-muted)" }}>No topics match the selected filters.</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          {BOOKS.map((b) => grouped[b]?.length ? (
            <BookSection key={b} title={`Book ${b}`} topics={grouped[b]} onEdit={startEdit} accent="#6366f1" />
          ) : null)}
          {unassigned.length > 0 && (
            <BookSection title="No Book Assigned" topics={unassigned} onEdit={startEdit} accent="#9ca3af" />
          )}
        </div>
      )}
    </>
  );
}

function BookSection({ title, topics, onEdit, accent }: {
  title: string; topics: any[]; onEdit: (t: any) => void; accent: string;
}) {
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
        <div style={{ width: 4, height: 20, background: accent, borderRadius: 2 }} />
        <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>{title}</h2>
        <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{topics.length} topic{topics.length !== 1 ? "s" : ""}</span>
      </div>
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Title</th>
              <th>Product</th>
              <th>Class</th>
              <th>Assigned To</th>
              <th>Due</th>
              <th>Status</th>
              <th>Docs</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {topics.map((t) => (
              <tr key={t.id}>
                <td style={{ fontWeight: 500, maxWidth: 240 }}>
                  <div>{t.title}</div>
                  {t.description && (
                    <div style={{ fontSize: 11.5, color: "var(--text-muted)", marginTop: 2 }}>{t.description}</div>
                  )}
                </td>
                <td>
                  <span className="badge badge-blue" style={{ fontSize: 11 }}>
                    {PRODUCT_LABELS[t.productType] ?? t.productType}
                  </span>
                </td>
                <td style={{ color: "var(--text-muted)", fontSize: 13 }}>{t.classFrom}–{t.classTo}</td>
                <td style={{ fontSize: 13 }}>{t.assignedTo?.name ?? "—"}</td>
                <td style={{ color: "var(--text-muted)", fontSize: 12.5 }}>{formatDate(t.dueDate)}</td>
                <td><span className={`badge ${STATUS_BADGE[t.status] ?? "badge-gray"}`}>{t.status}</span></td>
                <td style={{ color: "var(--text-muted)", fontSize: 13 }}>{t._count?.documents ?? 0}</td>
                <td>
                  <button className="btn" style={{ fontSize: 12 }} onClick={() => onEdit(t)}>Edit</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Content team view ────────────────────────────────────────────────────────
function ContentTeamTopicsPage() {
  const [topics,         setTopics]        = useState<any[]>([]);
  const [docs,           setDocs]          = useState<any[]>([]);
  const [selectedTopic,  setSelected]      = useState<any>(null);
  const [loading,        setLoading]       = useState(true);
  const [showNewDoc,     setShowNewDoc]    = useState(false);
  const [newDocTitle,    setNewDocTitle]   = useState("");
  const [creating,       setCreating]      = useState(false);
  const [error,          setError]         = useState("");
  const [filterBook,     setFilterBook]    = useState<string>("ALL");

  useEffect(() => {
    fetch("/api/content/topics", { credentials: "include" })
      .then((r) => r.json())
      .then((t) => setTopics(Array.isArray(t) ? t : []))
      .finally(() => setLoading(false));
  }, []);

  function selectTopic(topic: any) {
    setSelected(topic);
    setShowNewDoc(false);
    setDocs([]);
    fetch(`/api/content/documents?topicId=${topic.id}`, { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setDocs(Array.isArray(d) ? d : []));
  }

  async function createDoc() {
    if (!newDocTitle.trim() || !selectedTopic) return;
    setCreating(true); setError("");
    try {
      const res = await fetch("/api/content/documents", {
        method: "POST", headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ topicId: selectedTopic.id, title: newDocTitle }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Failed to create"); return; }
      window.location.href = `/content/documents/${data.id}`;
    } finally { setCreating(false); }
  }

  // Group topics by book number
  const grouped = BOOKS.reduce((acc, b) => {
    acc[b] = topics.filter((t) => t.bookNumber === b);
    return acc;
  }, {} as Record<number, any[]>);
  const unassigned = topics.filter((t) => !t.bookNumber);

  const displayTopics = filterBook === "ALL" ? topics
    : filterBook === "NONE" ? unassigned
    : topics.filter((t) => String(t.bookNumber) === filterBook);

  if (loading) return <p style={{ color: "var(--text-muted)" }}>Loading...</p>;

  return (
    <>
      <div className="page-header">
        <h1>My Topics</h1>
        <p>Select a topic to view and create documents.</p>
      </div>

      {/* Book summary cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 10, marginBottom: 20 }}>
        {BOOKS.map((b) => (
          <div key={b} className="card" style={{
            padding: "10px 14px", cursor: "pointer", textAlign: "center",
            border: filterBook === String(b) ? "2px solid var(--accent)" : "1px solid var(--border)",
            transition: "border 0.15s",
          }} onClick={() => setFilterBook(filterBook === String(b) ? "ALL" : String(b))}>
            <div style={{ fontSize: 16, fontWeight: 700, color: "var(--accent)" }}>Book {b}</div>
            <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
              {grouped[b]?.length ?? 0} topic{grouped[b]?.length !== 1 ? "s" : ""}
            </div>
          </div>
        ))}
        <div className="card" style={{
          padding: "10px 14px", cursor: "pointer", textAlign: "center",
          border: filterBook === "ALL" ? "2px solid var(--accent)" : "1px solid var(--border)",
        }} onClick={() => setFilterBook("ALL")}>
          <div style={{ fontSize: 16, fontWeight: 700 }}>All</div>
          <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>{topics.length} topics</div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "320px 1fr", gap: 20 }}>
        {/* Topic list */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {displayTopics.length === 0 ? (
            <div className="card"><div className="empty-state"><p>No topics for this book yet</p></div></div>
          ) : (
            displayTopics.map((t) => (
              <div key={t.id} onClick={() => selectTopic(t)} className="card"
                style={{
                  cursor: "pointer",
                  border: selectedTopic?.id === t.id ? "2px solid var(--accent)" : "1px solid var(--border)",
                  padding: "12px 14px", transition: "border 0.15s",
                }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
                  <h3 style={{ fontSize: 13, fontWeight: 600, margin: 0, lineHeight: 1.4 }}>{t.title}</h3>
                  <span className={`badge ${STATUS_BADGE[t.status] ?? "badge-gray"}`} style={{ fontSize: 10, flexShrink: 0, marginLeft: 6 }}>{t.status}</span>
                </div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {t.bookNumber && (
                    <span style={{ fontSize: 10, fontWeight: 700, padding: "1px 7px", borderRadius: 99, background: "rgba(99,102,241,0.1)", color: "#6366f1" }}>
                      Book {t.bookNumber}
                    </span>
                  )}
                  <span className="badge badge-blue" style={{ fontSize: 10 }}>{PRODUCT_LABELS[t.productType] ?? t.productType}</span>
                  <span className="badge badge-gray" style={{ fontSize: 10 }}>Cls {t.classFrom}–{t.classTo}</span>
                  <span className="badge badge-gray" style={{ fontSize: 10 }}>{t._count?.documents ?? 0} docs</span>
                </div>
                {t.dueDate && (
                  <p style={{ fontSize: 11, color: "var(--text-muted)", margin: "4px 0 0" }}>
                    Due: {new Date(t.dueDate).toLocaleDateString("en-IN")}
                  </p>
                )}
              </div>
            ))
          )}
        </div>

        {/* Document panel */}
        <div className="card">
          {!selectedTopic ? (
            <div className="empty-state"><p>Select a topic to view documents</p></div>
          ) : (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    {selectedTopic.bookNumber && (
                      <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 99, background: "rgba(99,102,241,0.1)", color: "#6366f1" }}>
                        Book {selectedTopic.bookNumber} · {selectedTopic.year ?? CURRENT_YEAR}
                      </span>
                    )}
                    <span className="badge badge-blue" style={{ fontSize: 11 }}>{PRODUCT_LABELS[selectedTopic.productType] ?? selectedTopic.productType}</span>
                    <span className="badge badge-gray" style={{ fontSize: 11 }}>Class {selectedTopic.classFrom}–{selectedTopic.classTo}</span>
                  </div>
                  <h2 style={{ margin: 0, fontSize: 15 }}>{selectedTopic.title}</h2>
                  {selectedTopic.description && (
                    <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "4px 0 0" }}>{selectedTopic.description}</p>
                  )}
                </div>
                <button className="btn btn-primary" style={{ fontSize: 13 }} onClick={() => setShowNewDoc(true)}>+ New Document</button>
              </div>

              {showNewDoc && (
                <div style={{ background: "var(--bg)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: 14, marginBottom: 16 }}>
                  {error && <p style={{ color: "var(--red)", fontSize: 13, marginBottom: 8 }}>{error}</p>}
                  <div style={{ display: "flex", gap: 8 }}>
                    <input className="input" placeholder="Document title..." value={newDocTitle}
                      onChange={(e) => setNewDocTitle(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && createDoc()} style={{ flex: 1 }} />
                    <button className="btn btn-primary" onClick={createDoc} disabled={creating}>
                      {creating ? "Creating..." : "Create"}
                    </button>
                    <button className="btn btn-ghost" onClick={() => setShowNewDoc(false)}>Cancel</button>
                  </div>
                </div>
              )}

              {docs.length === 0 ? (
                <div className="empty-state"><p>No documents for this topic yet</p></div>
              ) : (
                <table className="data-table">
                  <thead>
                    <tr><th>Title</th><th>Status</th><th>Version</th><th>Last Updated</th><th>Action</th></tr>
                  </thead>
                  <tbody>
                    {docs.map((d) => (
                      <tr key={d.id}>
                        <td style={{ fontWeight: 500 }}>{d.title}</td>
                        <td><span className={`badge ${STATUS_BADGE[d.status] ?? "badge-gray"}`}>{d.status}</span></td>
                        <td style={{ color: "var(--text-muted)", fontSize: 13 }}>v{d.version}</td>
                        <td style={{ color: "var(--text-muted)", fontSize: 13 }}>
                          {new Date(d.updatedAt).toLocaleDateString("en-IN")}
                        </td>
                        <td>
                          <Link href={`/content/documents/${d.id}`} className="btn btn-ghost" style={{ fontSize: 12, padding: "4px 10px" }}>
                            Open
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}

// ─── Root: dispatch by role ───────────────────────────────────────────────────
export default function ContentTopicsPage() {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    fetch("/api/auth/me", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setIsAdmin(d?.user?.roles?.includes("ADMIN") ?? false));
  }, []);

  if (isAdmin === null) return <p style={{ color: "var(--text-muted)" }}>Loading...</p>;
  return isAdmin ? <AdminTopicsPage /> : <ContentTeamTopicsPage />;
}
