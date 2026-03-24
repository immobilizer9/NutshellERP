"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Topic = {
  id: string;
  title: string;
  productType: string;
  classFrom: number;
  classTo: number;
  status: string;
  dueDate: string | null;
  assignedBy: { name: string };
  _count: { documents: number };
};

type Document = {
  id: string;
  title: string;
  status: string;
  updatedAt: string;
  topic: { id: string; title: string };
};

function formatDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

const STATUS_COLOR: Record<string, string> = {
  DRAFT: "var(--text-muted)",
  SUBMITTED: "var(--yellow)",
  APPROVED: "var(--green)",
  REJECTED: "var(--red)",
  DESIGN_SENT: "var(--blue)",
  PUBLISHED: "var(--accent)",
};

export default function ContentWorkspacePage() {
  const [modules, setModules]   = useState<string[]>([]);
  const [topics, setTopics]     = useState<Topic[]>([]);
  const [docs, setDocs]         = useState<Document[]>([]);
  const [loading, setLoading]   = useState(true);
  const [activeTab, setActiveTab] = useState<"topics" | "documents">("topics");
  const [newDocForm, setNewDocForm] = useState({ topicId: "", title: "" });
  const [creating, setCreating]   = useState(false);
  const [createMsg, setCreateMsg] = useState("");

  useEffect(() => {
    fetch("/api/auth/me", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => { if (d?.user?.modules) setModules(d.user.modules); });
  }, []);

  useEffect(() => {
    Promise.all([
      fetch("/api/content/topics", { credentials: "include" }).then((r) => r.json()),
      fetch("/api/content/documents", { credentials: "include" }).then((r) => r.json()),
    ]).then(([t, d]) => {
      setTopics(Array.isArray(t) ? t : []);
      setDocs(Array.isArray(d) ? d : []);
      setLoading(false);
    });
  }, []);

  const createDocument = async () => {
    if (!newDocForm.topicId || !newDocForm.title.trim()) {
      setCreateMsg("Topic and title are required."); return;
    }
    setCreating(true); setCreateMsg("");
    const res = await fetch("/api/content/documents", {
      method: "POST", headers: { "Content-Type": "application/json" },
      credentials: "include", body: JSON.stringify(newDocForm),
    });
    const data = await res.json();
    if (data.id) {
      window.location.href = `/content/documents/${data.id}`;
    } else {
      setCreateMsg(data.error || "Failed to create document.");
      setCreating(false);
    }
  };

  const docsByStatus = docs.reduce((acc, d) => {
    acc[d.status] = (acc[d.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <>
      <div className="page-header">
        <h1>My Content</h1>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 20 }}>
        {[
          { label: "Assigned Topics", value: topics.length },
          { label: "Total Documents", value: docs.length },
          { label: "Pending Review", value: (docsByStatus["SUBMITTED"] ?? 0) },
          { label: "Published", value: (docsByStatus["PUBLISHED"] ?? 0) },
        ].map((s) => (
          <div key={s.label} className="card" style={{ textAlign: "center", padding: "12px 8px" }}>
            <div style={{ fontSize: 22, fontWeight: 700 }}>{s.value}</div>
            <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* New document */}
      <div className="card" style={{ marginBottom: 20 }}>
        <h2 style={{ marginBottom: 12 }}>Create New Document</h2>
        {createMsg && <div className="alert alert-error" style={{ marginBottom: 10 }}>{createMsg}</div>}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: 10, alignItems: "flex-end" }}>
          <div>
            <label className="form-label">Topic</label>
            <select className="input" value={newDocForm.topicId}
              onChange={(e) => setNewDocForm((f) => ({ ...f, topicId: e.target.value }))}>
              <option value="">Select topic…</option>
              {topics.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title} (Cls {t.classFrom}–{t.classTo})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="form-label">Document Title</label>
            <input className="input" value={newDocForm.title}
              onChange={(e) => setNewDocForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="e.g. Chapter 5 GK Content" />
          </div>
          <button className="btn btn-primary" onClick={createDocument} disabled={creating}>
            {creating ? "Creating…" : "Create"}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 0, marginBottom: 16, borderBottom: "1px solid var(--border)" }}>
        {(["topics", "documents"] as const).map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            style={{
              padding: "8px 20px", fontSize: 13.5, fontWeight: activeTab === tab ? 600 : 400,
              background: "none", border: "none", cursor: "pointer",
              color: activeTab === tab ? "var(--accent)" : "var(--text-muted)",
              borderBottom: activeTab === tab ? "2px solid var(--accent)" : "2px solid transparent",
              marginBottom: -1,
            }}>
            {tab === "topics" ? "Assigned Topics" : "My Documents"}
          </button>
        ))}
      </div>

      {loading ? (
        <p style={{ color: "var(--text-muted)" }}>Loading…</p>
      ) : activeTab === "topics" ? (
        topics.length === 0 ? (
          <div className="card" style={{ textAlign: "center", padding: 32, color: "var(--text-muted)" }}>
            No topics assigned yet.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {topics.map((t) => (
              <div key={t.id} className="card" style={{ padding: "12px 16px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>{t.title}</div>
                    <div style={{ fontSize: 12, color: "var(--text-muted)", display: "flex", gap: 12 }}>
                      <span>{t.productType}</span>
                      <span>Class {t.classFrom}–{t.classTo}</span>
                      <span>Due: {formatDate(t.dueDate)}</span>
                      <span>Assigned by: {t.assignedBy.name}</span>
                      <span>{t._count.documents} document{t._count.documents !== 1 ? "s" : ""}</span>
                    </div>
                  </div>
                  <span style={{
                    fontSize: 11, fontWeight: 600, padding: "3px 9px", borderRadius: 99,
                    background: t.status === "COMPLETED" ? "rgba(22,163,74,0.1)" : t.status === "IN_PROGRESS" ? "rgba(99,102,241,0.1)" : "rgba(202,138,4,0.1)",
                    color: t.status === "COMPLETED" ? "var(--green)" : t.status === "IN_PROGRESS" ? "var(--accent)" : "var(--yellow)",
                  }}>
                    {t.status.replace("_", " ")}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        docs.length === 0 ? (
          <div className="card" style={{ textAlign: "center", padding: 32, color: "var(--text-muted)" }}>
            No documents yet. Create one above.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {docs.map((d) => (
              <Link key={d.id} href={`/content/documents/${d.id}`}
                style={{ textDecoration: "none", color: "inherit" }}>
                <div className="card" style={{ padding: "12px 16px", cursor: "pointer",
                  transition: "box-shadow 0.15s", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontWeight: 500, fontSize: 14 }}>{d.title}</div>
                    <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
                      Topic: {d.topic.title} · Updated {formatDate(d.updatedAt)}
                    </div>
                  </div>
                  <span style={{
                    fontSize: 11, fontWeight: 600, padding: "3px 9px", borderRadius: 99,
                    background: `${STATUS_COLOR[d.status]}18`,
                    color: STATUS_COLOR[d.status],
                    flexShrink: 0,
                  }}>
                    {d.status}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )
      )}
    </>
  );
}
