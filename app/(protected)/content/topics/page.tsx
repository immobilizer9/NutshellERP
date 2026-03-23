"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const STATUS_BADGE: Record<string, string> = {
  DRAFT:       "badge-gray",
  SUBMITTED:   "badge-yellow",
  APPROVED:    "badge-green",
  REJECTED:    "badge-red",
  DESIGN_SENT: "badge-indigo",
  PUBLISHED:   "badge-blue",
  OPEN:        "badge-blue",
  IN_PROGRESS: "badge-yellow",
  COMPLETED:   "badge-green",
};

const PRODUCT_LABELS: Record<string, string> = {
  ANNUAL:            "Annual",
  PAPERBACKS_PLAINS: "Paperbacks (Plains)",
  PAPERBACKS_HILLS:  "Paperbacks (Hills)",
  ONLINE:            "Online",
};

export default function ContentTopicsPage() {
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
    setCreating(true);
    setError("");
    try {
      const res = await fetch("/api/content/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ topicId: selectedTopic.id, title: newDocTitle }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Failed to create"); return; }
      setDocs((prev) => [data, ...prev]);
      setNewDocTitle("");
      setShowNewDoc(false);
    } finally {
      setCreating(false);
    }
  }

  if (loading) return <p style={{ color: "var(--text-muted)" }}>Loading...</p>;

  return (
    <>
      <div className="page-header">
        <h1>My Topics</h1>
        <p>Select a topic to view and create documents.</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "340px 1fr", gap: 20 }}>

        {/* Left: Topics list */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {topics.length === 0 ? (
            <div className="card">
              <div className="empty-state"><p>No topics assigned yet</p></div>
            </div>
          ) : (
            topics.map((t) => (
              <div
                key={t.id}
                onClick={() => selectTopic(t)}
                className="card"
                style={{
                  cursor: "pointer",
                  border: selectedTopic?.id === t.id ? "2px solid var(--accent)" : "1px solid var(--border)",
                  padding: "14px 16px",
                  transition: "border 0.15s",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                  <h3 style={{ fontSize: 14, fontWeight: 600, margin: 0, color: "var(--text-primary)" }}>{t.title}</h3>
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

        {/* Right: Documents panel */}
        <div className="card">
          {!selectedTopic ? (
            <div className="empty-state">
              <p>Select a topic to view documents</p>
            </div>
          ) : (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <div>
                  <h2 style={{ margin: 0 }}>{selectedTopic.title}</h2>
                  <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "4px 0 0" }}>
                    {PRODUCT_LABELS[selectedTopic.productType] ?? selectedTopic.productType} · Class {selectedTopic.classFrom}–{selectedTopic.classTo}
                  </p>
                </div>
                <button className="btn btn-primary" onClick={() => setShowNewDoc(true)}>
                  + New Document
                </button>
              </div>

              {showNewDoc && (
                <div style={{ background: "var(--bg)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: 16, marginBottom: 16 }}>
                  <h3 style={{ margin: "0 0 12px", fontSize: 14 }}>Create New Document</h3>
                  {error && <p style={{ color: "var(--red)", fontSize: 13, marginBottom: 8 }}>{error}</p>}
                  <div style={{ display: "flex", gap: 8 }}>
                    <input
                      className="input"
                      placeholder="Document title..."
                      value={newDocTitle}
                      onChange={(e) => setNewDocTitle(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && createDoc()}
                      style={{ flex: 1 }}
                    />
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
                      <tr>
                        <th>Title</th>
                        <th>Status</th>
                        <th>Last Updated</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {docs.map((d) => (
                        <tr key={d.id}>
                          <td style={{ fontWeight: 500 }}>{d.title}</td>
                          <td>
                            <span className={`badge ${STATUS_BADGE[d.status] ?? "badge-gray"}`}>{d.status}</span>
                          </td>
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
