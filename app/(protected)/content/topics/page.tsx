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
  ANNUAL:      "Annual",
  PAPERBACKS:  "Paperbacks",
  ONLINE:      "Online",
};

const PRODUCT_TYPES = Object.entries(PRODUCT_LABELS);

function formatDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

const BLANK_FORM = {
  title: "", description: "", productType: "ANNUAL",
  classFrom: "1", classTo: "5", assignedToId: "", dueDate: "",
};

// ─── Admin view ────────────────────────────────────────────────────────────
function AdminTopicsPage() {
  const [topics,     setTopics]     = useState<any[]>([]);
  const [users,      setUsers]      = useState<any[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [form,       setForm]       = useState({ ...BLANK_FORM });
  const [editId,     setEditId]     = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [msg,        setMsg]        = useState({ text: "", ok: false });
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
            // Show only content team and trainers as assignable
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
      const url    = "/api/content/topics";
      const method = editId ? "PATCH" : "POST";
      const body   = editId ? { id: editId, ...form } : form;
      const res = await fetch(url, {
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
    });
    setMsg({ text: "", ok: false });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const cancelEdit = () => { setEditId(null); setForm({ ...BLANK_FORM }); setMsg({ text: "", ok: false }); };

  const filtered = filterStatus === "ALL" ? topics : topics.filter((t) => t.status === filterStatus);

  const counts = topics.reduce((acc: Record<string, number>, t) => {
    acc[t.status] = (acc[t.status] || 0) + 1; return acc;
  }, {});

  if (loading) return <p style={{ color: "var(--text-muted)" }}>Loading...</p>;

  return (
    <>
      <div className="page-header">
        <h1>Content Topics</h1>
        <p>Create topics and assign them to content team members.</p>
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
              placeholder="e.g. Chapter 5 – Solar System (Class 5 Annual)" />
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
          {editId && (
            <button className="btn" onClick={cancelEdit}>Cancel</button>
          )}
        </div>
      </div>

      {/* All topics table */}
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2 style={{ margin: 0 }}>All Topics ({topics.length})</h2>
          <div style={{ display: "flex", gap: 4 }}>
            {["ALL", "OPEN", "IN_PROGRESS", "COMPLETED"].map((s) => (
              <button key={s} onClick={() => setFilterStatus(s)} className="btn"
                style={{ fontSize: 12,
                  background: filterStatus === s ? "var(--accent)" : undefined,
                  color: filterStatus === s ? "#fff" : undefined }}>
                {s === "ALL" ? `All (${topics.length})` : `${s.replace("_", " ")} (${counts[s] ?? 0})`}
              </button>
            ))}
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="empty-state" style={{ padding: 40 }}><p>No topics yet. Create one above.</p></div>
        ) : (
          <div className="table-wrap">
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
                {filtered.map((t) => (
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
                    <td style={{ color: "var(--text-muted)", fontSize: 13 }}>
                      {t.classFrom}–{t.classTo}
                    </td>
                    <td style={{ fontSize: 13 }}>{t.assignedTo?.name ?? "—"}</td>
                    <td style={{ color: "var(--text-muted)", fontSize: 12.5 }}>{formatDate(t.dueDate)}</td>
                    <td>
                      <span className={`badge ${STATUS_BADGE[t.status] ?? "badge-gray"}`}>{t.status}</span>
                    </td>
                    <td style={{ color: "var(--text-muted)", fontSize: 13 }}>{t._count?.documents ?? 0}</td>
                    <td>
                      <button className="btn" style={{ fontSize: 12 }} onClick={() => startEdit(t)}>
                        Edit
                      </button>
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

// ─── Content team view ─────────────────────────────────────────────────────
function ContentTeamTopicsPage() {
  const [topics, setTopics]           = useState<any[]>([]);
  const [docs,   setDocs]             = useState<any[]>([]);
  const [selectedTopic, setSelected]  = useState<any>(null);
  const [loading, setLoading]         = useState(true);
  const [showNewDoc, setShowNewDoc]   = useState(false);
  const [newDocTitle, setNewDocTitle] = useState("");
  const [creating, setCreating]       = useState(false);
  const [error, setError]             = useState("");

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
      setDocs((prev) => [data, ...prev]);
      setNewDocTitle(""); setShowNewDoc(false);
    } finally { setCreating(false); }
  }

  if (loading) return <p style={{ color: "var(--text-muted)" }}>Loading...</p>;

  return (
    <>
      <div className="page-header">
        <h1>My Topics</h1>
        <p>Select a topic to view and create documents.</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "340px 1fr", gap: 20 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {topics.length === 0 ? (
            <div className="card"><div className="empty-state"><p>No topics assigned yet</p></div></div>
          ) : (
            topics.map((t) => (
              <div key={t.id} onClick={() => selectTopic(t)} className="card"
                style={{
                  cursor: "pointer",
                  border: selectedTopic?.id === t.id ? "2px solid var(--accent)" : "1px solid var(--border)",
                  padding: "14px 16px", transition: "border 0.15s",
                }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                  <h3 style={{ fontSize: 14, fontWeight: 600, margin: 0 }}>{t.title}</h3>
                  <span className={`badge ${STATUS_BADGE[t.status] ?? "badge-gray"}`}>{t.status}</span>
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 6 }}>
                  <span className="badge badge-blue" style={{ fontSize: 11 }}>{PRODUCT_LABELS[t.productType] ?? t.productType}</span>
                  <span className="badge badge-gray" style={{ fontSize: 11 }}>Class {t.classFrom}–{t.classTo}</span>
                  <span className="badge badge-gray" style={{ fontSize: 11 }}>{t._count?.documents ?? 0} docs</span>
                </div>
                {t.dueDate && (
                  <p style={{ fontSize: 12, color: "var(--text-muted)", margin: 0 }}>
                    Due: {new Date(t.dueDate).toLocaleDateString("en-IN")}
                  </p>
                )}
              </div>
            ))
          )}
        </div>

        <div className="card">
          {!selectedTopic ? (
            <div className="empty-state"><p>Select a topic to view documents</p></div>
          ) : (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <div>
                  <h2 style={{ margin: 0 }}>{selectedTopic.title}</h2>
                  <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "4px 0 0" }}>
                    {PRODUCT_LABELS[selectedTopic.productType] ?? selectedTopic.productType} · Class {selectedTopic.classFrom}–{selectedTopic.classTo}
                  </p>
                </div>
                <button className="btn btn-primary" onClick={() => setShowNewDoc(true)}>+ New Document</button>
              </div>

              {showNewDoc && (
                <div style={{ background: "var(--bg)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: 16, marginBottom: 16 }}>
                  <h3 style={{ margin: "0 0 12px", fontSize: 14 }}>Create New Document</h3>
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
                <div className="table-wrap">
                  <table className="data-table">
                    <thead>
                      <tr><th>Title</th><th>Status</th><th>Last Updated</th><th>Action</th></tr>
                    </thead>
                    <tbody>
                      {docs.map((d) => (
                        <tr key={d.id}>
                          <td style={{ fontWeight: 500 }}>{d.title}</td>
                          <td><span className={`badge ${STATUS_BADGE[d.status] ?? "badge-gray"}`}>{d.status}</span></td>
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
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}

// ─── Root: dispatch by role ────────────────────────────────────────────────
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
