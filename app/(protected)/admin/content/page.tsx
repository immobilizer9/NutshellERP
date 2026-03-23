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

type Tab = "topics" | "documents" | "design";

export default function AdminContentPage() {
  const [tab,     setTab]     = useState<Tab>("topics");
  const [topics,  setTopics]  = useState<any[]>([]);
  const [docs,    setDocs]    = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [topicStatus,   setTopicStatus]   = useState("");
  const [topicProduct,  setTopicProduct]  = useState("");
  const [docStatus,     setDocStatus]     = useState("");

  // Inline reject
  const [rejectId,      setRejectId]      = useState<string | null>(null);
  const [rejectComment, setRejectComment] = useState("");
  const [acting,        setActing]        = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/content/topics",    { credentials: "include" }).then((r) => r.json()),
      fetch("/api/content/documents", { credentials: "include" }).then((r) => r.json()),
    ]).then(([t, d]) => {
      setTopics(Array.isArray(t) ? t : []);
      setDocs(Array.isArray(d) ? d : []);
    }).finally(() => setLoading(false));
  }, []);

  async function action(id: string, act: string, extra?: Record<string, any>) {
    setActing(true);
    try {
      const res = await fetch("/api/content/documents", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ id, action: act, ...extra }),
      });
      const data = await res.json();
      if (res.ok) {
        setDocs((prev) => prev.map((d) => (d.id === id ? data : d)));
        setRejectId(null);
        setRejectComment("");
      }
    } finally {
      setActing(false);
    }
  }

  if (loading) return <p style={{ color: "var(--text-muted)" }}>Loading...</p>;

  const filteredTopics = topics.filter((t) => {
    if (topicStatus && t.status !== topicStatus) return false;
    if (topicProduct && t.productType !== topicProduct) return false;
    return true;
  });

  const filteredDocs = docs.filter((d) => {
    if (docStatus && d.status !== docStatus) return false;
    return true;
  });

  const designQueue = docs.filter((d) => d.status === "DESIGN_SENT");

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Content Management</h1>
          <p>Manage topics, review documents, and track design queue.</p>
        </div>
        <Link href="/admin/content/topics/new" className="btn btn-primary">+ New Topic</Link>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 0, marginBottom: 20, borderBottom: "2px solid var(--border)" }}>
        {([
          { key: "topics",    label: `Topics (${topics.length})` },
          { key: "documents", label: `Documents (${docs.length})` },
          { key: "design",    label: `Design Queue (${designQueue.length})` },
        ] as const).map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              padding: "10px 20px",
              fontSize: 14,
              fontWeight: tab === t.key ? 700 : 400,
              color: tab === t.key ? "var(--accent)" : "var(--text-muted)",
              background: "none",
              border: "none",
              borderBottom: tab === t.key ? "2px solid var(--accent)" : "2px solid transparent",
              cursor: "pointer",
              marginBottom: -2,
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* TOPICS TAB */}
      {tab === "topics" && (
        <>
          <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
            <select className="input" style={{ width: "auto" }} value={topicStatus} onChange={(e) => setTopicStatus(e.target.value)}>
              <option value="">All Statuses</option>
              <option value="OPEN">Open</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="COMPLETED">Completed</option>
            </select>
            <select className="input" style={{ width: "auto" }} value={topicProduct} onChange={(e) => setTopicProduct(e.target.value)}>
              <option value="">All Products</option>
              <option value="ANNUAL">Annual</option>
              <option value="PAPERBACKS_PLAINS">Paperbacks (Plains)</option>
              <option value="PAPERBACKS_HILLS">Paperbacks (Hills)</option>
              <option value="ONLINE">Online</option>
            </select>
          </div>

          {filteredTopics.length === 0 ? (
            <div className="empty-state"><p>No topics found</p></div>
          ) : (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Product</th>
                    <th>Class</th>
                    <th>Assigned To</th>
                    <th>Due Date</th>
                    <th>Docs</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTopics.map((t) => (
                    <tr key={t.id}>
                      <td style={{ fontWeight: 500 }}>{t.title}</td>
                      <td><span className="badge badge-blue" style={{ fontSize: 11 }}>{PRODUCT_LABELS[t.productType] ?? t.productType}</span></td>
                      <td>{t.classFrom}–{t.classTo}</td>
                      <td>{t.assignedTo?.name ?? "—"}</td>
                      <td style={{ color: "var(--text-muted)", fontSize: 13 }}>
                        {t.dueDate ? new Date(t.dueDate).toLocaleDateString("en-IN") : "—"}
                      </td>
                      <td>{t._count?.documents ?? 0}</td>
                      <td><span className={`badge ${STATUS_BADGE[t.status] ?? "badge-gray"}`}>{t.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* DOCUMENTS TAB */}
      {tab === "documents" && (
        <>
          <div style={{ marginBottom: 16 }}>
            <select className="input" style={{ width: "auto" }} value={docStatus} onChange={(e) => setDocStatus(e.target.value)}>
              <option value="">All Statuses</option>
              <option value="DRAFT">Draft</option>
              <option value="SUBMITTED">Submitted</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
              <option value="DESIGN_SENT">Design Sent</option>
              <option value="PUBLISHED">Published</option>
            </select>
          </div>

          {filteredDocs.length === 0 ? (
            <div className="empty-state"><p>No documents found</p></div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {filteredDocs.map((d) => (
                <div key={d.id} className="card" style={{ padding: "14px 16px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 4 }}>
                        <Link href={`/content/documents/${d.id}`} style={{ fontWeight: 600, color: "var(--accent)" }}>{d.title}</Link>
                        <span className={`badge ${STATUS_BADGE[d.status] ?? "badge-gray"}`}>{d.status}</span>
                      </div>
                      <p style={{ fontSize: 12, color: "var(--text-muted)", margin: 0 }}>
                        Topic: {d.topic?.title} · Author: {d.author?.name} · {new Date(d.updatedAt).toLocaleDateString("en-IN")}
                      </p>
                    </div>
                    <div style={{ display: "flex", gap: 6, flexShrink: 0, flexWrap: "wrap", justifyContent: "flex-end" }}>
                      {d.status === "SUBMITTED" && (
                        <>
                          <button className="btn btn-success" style={{ fontSize: 12, padding: "4px 10px" }} onClick={() => action(d.id, "approve")} disabled={acting}>Approve</button>
                          <button className="btn btn-danger"  style={{ fontSize: 12, padding: "4px 10px" }} onClick={() => setRejectId(d.id)} disabled={acting}>Reject</button>
                          <button className="btn btn-secondary" style={{ fontSize: 12, padding: "4px 10px" }} onClick={() => action(d.id, "send_to_design")} disabled={acting}>Send to Design</button>
                        </>
                      )}
                      {d.status === "APPROVED" && (
                        <>
                          <button className="btn btn-secondary" style={{ fontSize: 12, padding: "4px 10px" }} onClick={() => action(d.id, "send_to_design")} disabled={acting}>Send to Design</button>
                          <button className="btn btn-primary"  style={{ fontSize: 12, padding: "4px 10px" }} onClick={() => action(d.id, "publish")} disabled={acting}>Publish</button>
                        </>
                      )}
                      {d.status === "DESIGN_SENT" && (
                        <button className="btn btn-primary" style={{ fontSize: 12, padding: "4px 10px" }} onClick={() => action(d.id, "publish")} disabled={acting}>Publish</button>
                      )}
                    </div>
                  </div>
                  {rejectId === d.id && (
                    <div style={{ marginTop: 12, display: "flex", gap: 8, alignItems: "flex-start" }}>
                      <textarea
                        className="input"
                        placeholder="Reason for rejection..."
                        value={rejectComment}
                        onChange={(e) => setRejectComment(e.target.value)}
                        style={{ flex: 1, height: 64, resize: "vertical" }}
                      />
                      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                        <button className="btn btn-danger" style={{ fontSize: 12 }} onClick={() => action(d.id, "reject", { adminComment: rejectComment })} disabled={acting}>Confirm Reject</button>
                        <button className="btn btn-ghost"  style={{ fontSize: 12 }} onClick={() => { setRejectId(null); setRejectComment(""); }}>Cancel</button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* DESIGN QUEUE TAB */}
      {tab === "design" && (
        <>
          {designQueue.length === 0 ? (
            <div className="empty-state"><p>No documents in design queue</p></div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {designQueue.map((d) => (
                <div key={d.id} className="card" style={{ padding: "14px 16px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div>
                      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 4 }}>
                        <Link href={`/content/documents/${d.id}`} style={{ fontWeight: 600, color: "var(--accent)" }}>{d.title}</Link>
                        <span className="badge badge-indigo">DESIGN SENT</span>
                      </div>
                      <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "0 0 4px" }}>
                        Topic: {d.topic?.title} · {PRODUCT_LABELS[d.topic?.productType] ?? d.topic?.productType} · Class {d.topic?.classFrom}–{d.topic?.classTo}
                      </p>
                      {d.sentToDesignAt && (
                        <p style={{ fontSize: 12, color: "var(--text-muted)", margin: 0 }}>
                          Sent: {new Date(d.sentToDesignAt).toLocaleDateString("en-IN")}
                        </p>
                      )}
                      {d.adminComment && (
                        <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "4px 0 0", fontStyle: "italic" }}>
                          Note: {d.adminComment}
                        </p>
                      )}
                    </div>
                    <div style={{ display: "flex", gap: 6 }}>
                      {d.designedFileUrl && (
                        <a href={d.designedFileUrl} target="_blank" rel="noopener noreferrer" className="btn btn-success" style={{ fontSize: 12, padding: "4px 10px" }}>
                          View Design
                        </a>
                      )}
                      <button className="btn btn-primary" style={{ fontSize: 12, padding: "4px 10px" }} onClick={() => action(d.id, "publish")} disabled={acting}>Publish</button>
                    </div>
                  </div>
                  {d.designedFileUrl && (
                    <div style={{ marginTop: 8, fontSize: 13, color: "var(--text-muted)" }}>
                      File: <a href={d.designedFileUrl} target="_blank" rel="noopener noreferrer" style={{ color: "var(--accent)" }}>{d.designedFileName ?? d.designedFileUrl}</a>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </>
  );
}
