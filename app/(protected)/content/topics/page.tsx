"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const STATUS_BADGE: Record<string, { bg: string; color: string }> = {
  DRAFT:       { bg: "rgba(156,163,175,0.15)", color: "#6b7280" },
  SUBMITTED:   { bg: "rgba(202,138,4,0.12)",   color: "#b45309" },
  APPROVED:    { bg: "rgba(22,163,74,0.12)",   color: "#15803d" },
  REJECTED:    { bg: "rgba(220,38,38,0.12)",   color: "#dc2626" },
  DESIGN_SENT: { bg: "rgba(99,102,241,0.12)",  color: "#6366f1" },
  PUBLISHED:   { bg: "rgba(99,102,241,0.18)",  color: "#4338ca" },
  OPEN:        { bg: "rgba(59,130,246,0.12)",  color: "#2563eb" },
  IN_PROGRESS: { bg: "rgba(202,138,4,0.12)",   color: "#b45309" },
  COMPLETED:   { bg: "rgba(22,163,74,0.12)",   color: "#15803d" },
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

function Badge({ status }: { status: string }) {
  const s = STATUS_BADGE[status] ?? { bg: "rgba(156,163,175,0.15)", color: "#6b7280" };
  return (
    <span style={{
      fontSize: 10.5, fontWeight: 600, padding: "2px 8px", borderRadius: 99,
      background: s.bg, color: s.color, whiteSpace: "nowrap",
    }}>
      {status.replace(/_/g, " ")}
    </span>
  );
}

function timeAgo(d: string) {
  const diff = Date.now() - new Date(d).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function dueDateStyle(dueDate: string | null): React.CSSProperties {
  if (!dueDate) return { color: "var(--text-muted)" };
  const days = (new Date(dueDate).getTime() - Date.now()) / 86400000;
  if (days < 0) return { color: "#dc2626", fontWeight: 600 };
  if (days < 3) return { color: "#d97706", fontWeight: 600 };
  return { color: "var(--text-muted)" };
}

function formatDate(d: string | null) {
  if (!d) return null;
  return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

const BLANK_FORM = {
  title: "", description: "", productType: "PAPERBACKS_PLAINS",
  classFrom: "1", classTo: "5", assignedToId: "", dueDate: "",
  bookNumber: "", year: String(CURRENT_YEAR),
};

// ─── Topic Card ───────────────────────────────────────────────────────────────
function TopicCard({
  topic, onClick, showAssignee = false,
}: {
  topic: any; onClick?: () => void; showAssignee?: boolean;
}) {
  // Use primary document; fall back to most-recent document from one-to-many relation
  const doc = topic.document ?? topic.documents?.[0] ?? null;
  const dueStyle = dueDateStyle(topic.dueDate);
  const days = topic.dueDate ? (new Date(topic.dueDate).getTime() - Date.now()) / 86400000 : null;

  return (
    <div
      onClick={onClick}
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-xl, 14px)",
        padding: "16px 18px",
        cursor: onClick ? "pointer" : "default",
        transition: "box-shadow 0.15s, border-color 0.15s",
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
      onMouseEnter={(e) => { if (onClick) (e.currentTarget as HTMLDivElement).style.boxShadow = "0 4px 16px rgba(0,0,0,0.1)"; }}
      onMouseLeave={(e) => { if (onClick) (e.currentTarget as HTMLDivElement).style.boxShadow = "none"; }}
    >
      {/* Top row: badges */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
        <span style={{
          fontSize: 10.5, fontWeight: 700, padding: "2px 8px", borderRadius: 99,
          background: "rgba(99,102,241,0.1)", color: "#6366f1",
        }}>
          {PRODUCT_LABELS[topic.productType] ?? topic.productType}
        </span>
        <span style={{
          fontSize: 10.5, padding: "2px 8px", borderRadius: 99,
          background: "rgba(156,163,175,0.12)", color: "var(--text-muted)",
        }}>
          Class {topic.classFrom}–{topic.classTo}
        </span>
        {topic.bookNumber && (
          <span style={{
            fontSize: 10.5, fontWeight: 600, padding: "2px 8px", borderRadius: 99,
            background: "rgba(99,102,241,0.08)", color: "#818cf8",
          }}>
            Book {topic.bookNumber}
          </span>
        )}
        <div style={{ flex: 1 }} />
        <Badge status={topic.status} />
      </div>

      {/* Title */}
      <div>
        <div style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.4, marginBottom: 2 }}>{topic.title}</div>
        {topic.description && (
          <div style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.4 }}>{topic.description}</div>
        )}
      </div>

      {/* Doc status row */}
      {doc && (
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <Badge status={doc.status} />
          {doc.wordCount > 0 && (
            <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{doc.wordCount.toLocaleString()} words</span>
          )}
          <span style={{ fontSize: 11, color: "var(--text-muted)" }}>saved {timeAgo(doc.updatedAt)}</span>
        </div>
      )}

      {/* Rejection comment */}
      {doc?.status === "REJECTED" && doc.adminComment && (
        <div style={{
          fontSize: 12, color: "#dc2626", background: "rgba(220,38,38,0.05)",
          border: "1px solid rgba(220,38,38,0.15)", borderRadius: 6, padding: "6px 10px",
        }}>
          <strong>Feedback:</strong> {doc.adminComment}
        </div>
      )}

      {/* Footer */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 2 }}>
        <div style={{ display: "flex", gap: 12, fontSize: 11 }}>
          {topic.dueDate && (
            <span style={dueStyle}>
              {days !== null && days < 0 ? "Overdue" : "Due"} {formatDate(topic.dueDate)}
            </span>
          )}
          {showAssignee && topic.assignedTo && (
            <span style={{ color: "var(--text-muted)" }}>{topic.assignedTo.name}</span>
          )}
        </div>
        {onClick && (
          <span style={{ fontSize: 12, color: "#6366f1", fontWeight: 500 }}>
            {doc ? "Open Editor →" : "No doc yet"}
          </span>
        )}
      </div>
    </div>
  );
}

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
  const [showForm,     setShowForm]     = useState(false);
  const router = useRouter();

  const fetchTopics = () =>
    fetch("/api/content/topics?limit=200", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setTopics(Array.isArray(d) ? d : (d?.topics ?? [])));

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
      setShowForm(false);
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
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const cancelEdit = () => { setEditId(null); setForm({ ...BLANK_FORM }); setMsg({ text: "", ok: false }); setShowForm(false); };

  const filtered = topics.filter((t) => {
    if (filterYear !== "ALL" && String(t.year ?? CURRENT_YEAR) !== filterYear) return false;
    if (filterBook !== "ALL") {
      const b = filterBook === "NONE" ? !t.bookNumber : String(t.bookNumber) === filterBook;
      if (!b) return false;
    }
    if (filterStatus !== "ALL" && t.status !== filterStatus) return false;
    return true;
  });

  const topicYears = [...new Set(topics.map((t) => t.year ?? CURRENT_YEAR))].sort();

  if (loading) return <div style={{ color: "var(--text-muted)", padding: "40px 0", textAlign: "center" }}>Loading...</div>;

  return (
    <>
      <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h1>Content Topics</h1>
          <p>Organise content by Book and assign to team members.</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setShowForm(!showForm); setEditId(null); setForm({ ...BLANK_FORM }); }}>
          {showForm ? "Cancel" : "+ New Topic"}
        </button>
      </div>

      {/* Create / Edit form */}
      {showForm && (
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
            <button className="btn" onClick={cancelEdit}>Cancel</button>
          </div>
        </div>
      )}

      {!showForm && msg.text && (
        <div className={`alert ${msg.ok ? "alert-success" : "alert-error"}`} style={{ marginBottom: 16 }}>{msg.text}</div>
      )}

      {/* Filters */}
      <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
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
            {b === "ALL" ? "All" : b === "NONE" ? "Unassigned" : `Book ${b}`}
          </button>
        ))}
        <span style={{ width: 1, height: 20, background: "var(--border)", margin: "0 4px" }} />
        {["ALL", "OPEN", "IN_PROGRESS", "COMPLETED"].map((s) => (
          <button key={s} className="btn" style={{ fontSize: 12, background: filterStatus === s ? "var(--accent)" : undefined, color: filterStatus === s ? "#fff" : undefined }}
            onClick={() => setFilterStatus(s)}>
            {s === "ALL" ? "All Status" : s.replace("_", " ")}
          </button>
        ))}
        <span style={{ marginLeft: "auto", fontSize: 12, color: "var(--text-muted)" }}>{filtered.length} topic{filtered.length !== 1 ? "s" : ""}</span>
      </div>

      {/* Card grid */}
      {filtered.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: 40, color: "var(--text-muted)" }}>
          No topics match the selected filters.
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 16 }}>
          {filtered.map((t) => {
            const primaryDocId = t.documentId ?? t.documents?.[0]?.id ?? null;
            return (
            <div key={t.id} style={{ position: "relative" }}>
              <TopicCard
                topic={t}
                showAssignee={true}
                onClick={primaryDocId ? () => router.push(`/content/workspace/${primaryDocId}`) : undefined}
              />
              <button
                className="btn"
                style={{ position: "absolute", top: 12, right: 12, fontSize: 11, padding: "3px 8px", zIndex: 2 }}
                onClick={(e) => { e.stopPropagation(); startEdit(t); }}
              >
                Edit
              </button>
            </div>
            );
          })}
        </div>
      )}
    </>
  );
}

// ─── Content team view ────────────────────────────────────────────────────────
function ContentTeamTopicsPage() {
  const [topics,   setTopics]   = useState<any[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [filterBook, setFilterBook] = useState<string>("ALL");
  const router = useRouter();

  useEffect(() => {
    fetch("/api/content/topics?limit=200", { credentials: "include" })
      .then((r) => r.json())
      .then((t) => setTopics(Array.isArray(t) ? t : (t?.topics ?? [])))
      .finally(() => setLoading(false));
  }, []);

  const grouped = BOOKS.reduce((acc, b) => {
    acc[b] = topics.filter((t) => t.bookNumber === b);
    return acc;
  }, {} as Record<number, any[]>);
  const unassigned = topics.filter((t) => !t.bookNumber);

  const displayTopics = filterBook === "ALL" ? topics
    : filterBook === "NONE" ? unassigned
    : topics.filter((t) => String(t.bookNumber) === filterBook);

  if (loading) return <div style={{ color: "var(--text-muted)", padding: "40px 0", textAlign: "center" }}>Loading...</div>;

  return (
    <>
      <div className="page-header">
        <h1>My Topics</h1>
        <p>Click a topic to open the editor.</p>
      </div>

      {/* Book summary filter */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 10, marginBottom: 20 }}>
        {BOOKS.map((b) => (
          <div key={b} className="card" style={{
            padding: "10px 14px", cursor: "pointer", textAlign: "center",
            border: filterBook === String(b) ? "2px solid var(--accent)" : "1px solid var(--border)",
            transition: "border 0.15s",
          }} onClick={() => setFilterBook(filterBook === String(b) ? "ALL" : String(b))}>
            <div style={{ fontSize: 15, fontWeight: 700, color: "var(--accent)" }}>Book {b}</div>
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
              {grouped[b]?.length ?? 0} topic{grouped[b]?.length !== 1 ? "s" : ""}
            </div>
          </div>
        ))}
        <div className="card" style={{
          padding: "10px 14px", cursor: "pointer", textAlign: "center",
          border: filterBook === "ALL" ? "2px solid var(--accent)" : "1px solid var(--border)",
        }} onClick={() => setFilterBook("ALL")}>
          <div style={{ fontSize: 15, fontWeight: 700 }}>All</div>
          <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>{topics.length} topics</div>
        </div>
      </div>

      {displayTopics.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: 40, color: "var(--text-muted)" }}>
          No topics assigned yet.
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>
          {displayTopics.map((t) => {
            const primaryDocId = t.documentId ?? t.documents?.[0]?.id ?? null;
            return (
              <div key={t.id} style={{ position: "relative" }}>
                <TopicCard
                  topic={t}
                  onClick={primaryDocId ? () => router.push(`/content/workspace/${primaryDocId}`) : undefined}
                />
                {!primaryDocId && (
                  <p style={{ position: "absolute", bottom: 14, right: 14, fontSize: 11, color: "#dc2626", margin: 0, zIndex: 2 }}>
                    Contact admin
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}

// ─── Root: dispatch by role ───────────────────────────────────────────────────
export default function ContentTopicsPage() {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    fetch("/api/auth/me", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => {
        const modules: string[] = d?.user?.modules ?? [];
        const roles: string[]   = d?.user?.roles   ?? [];
        setIsAdmin(
          modules.includes("USER_MANAGEMENT") ||
          modules.includes("CONTENT_ASSIGN")  ||
          roles.includes("ADMIN")
        );
      });
  }, []);

  if (isAdmin === null) return <div style={{ color: "var(--text-muted)", padding: "40px 0", textAlign: "center" }}>Loading...</div>;
  return isAdmin ? <AdminTopicsPage /> : <ContentTeamTopicsPage />;
}
