"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Document = {
  id: string;
  title: string;
  status: string;
  version: number;
  adminComment: string | null;
  updatedAt: string;
  createdAt: string;
  topic: { id: string; title: string; productType: string; classFrom: number; classTo: number };
  author: { id: string; name: string; email: string };
};

function formatDate(d: string) {
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

export default function ContentReviewPage() {
  const [docs, setDocs]           = useState<Document[]>([]);
  const [loading, setLoading]     = useState(true);
  const [filterStatus, setFilterStatus] = useState("SUBMITTED");
  const [actionDoc, setActionDoc] = useState<string | null>(null);
  const [comment, setComment]     = useState("");
  const [processing, setProcessing] = useState<string | null>(null);
  const [msg, setMsg]             = useState({ text: "", ok: false });

  const fetchDocs = async () => {
    setLoading(true);
    const url = filterStatus === "ALL" ? "/api/content/documents" : `/api/content/documents?status=${filterStatus}`;
    const res = await fetch(url, { credentials: "include" }).then((r) => r.json());
    setDocs(Array.isArray(res) ? res : []);
    setLoading(false);
  };

  useEffect(() => { fetchDocs(); }, [filterStatus]);

  const review = async (docId: string, action: "approve" | "reject" | "send_design" | "publish") => {
    setProcessing(docId); setMsg({ text: "", ok: false });
    try {
      const body: any = { id: docId };
      if (action === "approve")     body.action = "approve";
      if (action === "reject")      { body.action = "reject"; body.adminComment = comment; }
      if (action === "send_design") body.action = "send_to_design";
      if (action === "publish")     body.action = "publish";

      const res = await fetch("/api/content/documents", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        credentials: "include", body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setMsg({ text: `Document ${action === "approve" ? "approved" : action === "reject" ? "rejected" : action === "send_design" ? "sent to design" : "published"}.`, ok: true });
      setActionDoc(null); setComment("");
      fetchDocs();
    } catch (err: any) {
      setMsg({ text: err.message, ok: false });
    } finally {
      setProcessing(null);
    }
  };

  const counts = docs.reduce((acc, d) => {
    acc[d.status] = (acc[d.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <>
      <div className="page-header">
        <h1>Content Review</h1>
        <p>Review, approve, and publish content documents</p>
      </div>

      {msg.text && (
        <div className={`alert ${msg.ok ? "alert-success" : "alert-error"}`} style={{ marginBottom: 16 }}>{msg.text}</div>
      )}

      {/* Status filter tabs */}
      <div style={{ display: "flex", gap: 6, marginBottom: 20, flexWrap: "wrap" }}>
        {["SUBMITTED", "APPROVED", "REJECTED", "DESIGN_SENT", "PUBLISHED", "ALL"].map((s) => (
          <button key={s} onClick={() => setFilterStatus(s)}
            className="btn"
            style={{
              fontSize: 12,
              background: filterStatus === s ? "var(--accent)" : undefined,
              color: filterStatus === s ? "#fff" : undefined,
            }}>
            {s === "ALL" ? "All" : s.replace("_", " ")}
            {s !== "ALL" && counts[s] ? ` (${counts[s]})` : ""}
          </button>
        ))}
      </div>

      {loading ? (
        <p style={{ color: "var(--text-muted)" }}>Loading…</p>
      ) : docs.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: 32, color: "var(--text-muted)" }}>
          No documents with status "{filterStatus === "ALL" ? "any" : filterStatus}"
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {docs.map((doc) => (
            <div key={doc.id} className="card">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 4 }}>{doc.title}</div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)", display: "flex", gap: 12, flexWrap: "wrap" }}>
                    <span>Topic: {doc.topic.title}</span>
                    <span>{doc.topic.productType} · Class {doc.topic.classFrom}–{doc.topic.classTo}</span>
                    <span>Author: {doc.author.name}</span>
                    <span>v{doc.version}</span>
                    <span>Updated {formatDate(doc.updatedAt)}</span>
                  </div>
                </div>
                <span style={{
                  fontSize: 11, fontWeight: 600, padding: "3px 9px", borderRadius: 99, flexShrink: 0,
                  background: `${STATUS_COLOR[doc.status]}18`,
                  color: STATUS_COLOR[doc.status],
                }}>
                  {doc.status.replace("_", " ")}
                </span>
              </div>

              {doc.adminComment && (
                <div style={{ marginBottom: 10, padding: "8px 12px", background: "rgba(220,38,38,0.06)",
                  border: "1px solid rgba(220,38,38,0.15)", borderRadius: 6, fontSize: 13, color: "var(--red)" }}>
                  Previous comment: {doc.adminComment}
                </div>
              )}

              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                <Link href={`/content/documents/${doc.id}`}>
                  <button className="btn" style={{ fontSize: 12 }}>View Document</button>
                </Link>

                {doc.status === "SUBMITTED" && (
                  <>
                    <button className="btn btn-primary" style={{ fontSize: 12 }}
                      onClick={() => review(doc.id, "approve")}
                      disabled={processing === doc.id}>
                      Approve
                    </button>
                    <button className="btn btn-danger" style={{ fontSize: 12 }}
                      onClick={() => setActionDoc(actionDoc === doc.id ? null : doc.id)}>
                      Reject
                    </button>
                  </>
                )}

                {doc.status === "APPROVED" && (
                  <button className="btn" style={{ fontSize: 12, background: "var(--blue)", color: "#fff" }}
                    onClick={() => review(doc.id, "send_design")}
                    disabled={processing === doc.id}>
                    Send to Design
                  </button>
                )}

                {doc.status === "DESIGN_SENT" && (
                  <button className="btn btn-primary" style={{ fontSize: 12 }}
                    onClick={() => review(doc.id, "publish")}
                    disabled={processing === doc.id}>
                    Mark Published
                  </button>
                )}
              </div>

              {actionDoc === doc.id && (
                <div style={{ marginTop: 12, padding: 12, background: "rgba(220,38,38,0.04)",
                  border: "1px solid rgba(220,38,38,0.12)", borderRadius: 8 }}>
                  <label className="form-label" style={{ marginBottom: 6 }}>Rejection reason (required)</label>
                  <textarea className="input" rows={3} value={comment}
                    onChange={(e) => setComment(e.target.value)} placeholder="Explain what needs to be revised…" />
                  <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                    <button className="btn btn-danger" style={{ fontSize: 12 }}
                      onClick={() => review(doc.id, "reject")}
                      disabled={!comment.trim() || processing === doc.id}>
                      Confirm Rejection
                    </button>
                    <button className="btn" style={{ fontSize: 12 }} onClick={() => { setActionDoc(null); setComment(""); }}>
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </>
  );
}
