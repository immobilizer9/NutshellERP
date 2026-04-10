"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────
type Doc = {
  id: string; title: string; status: string; version: number;
  adminComment: string | null; updatedAt: string; createdAt: string;
  topic: { id: string; title: string; productType: string; classFrom: number; classTo: number };
  author: { id: string; name: string; email: string };
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function timeAgo(d: string) {
  const diff = Date.now() - new Date(d).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

const STATUS_COLOR: Record<string, string> = {
  DRAFT: "var(--text-muted)", SUBMITTED: "var(--yellow)", APPROVED: "var(--green)",
  REJECTED: "var(--red)", DESIGN_SENT: "#6366f1", PUBLISHED: "var(--accent)",
};

// ─── Review Side Panel ────────────────────────────────────────────────────────
function ReviewSidePanel({
  doc, isAdmin, onClose, onStatusChange,
}: {
  doc: Doc; isAdmin: boolean; onClose: () => void; onStatusChange: (updated: Doc) => void;
}) {
  const [docBody,       setDocBody]       = useState("");
  const [loadingBody,   setLoadingBody]   = useState(true);
  const [processing,    setProcessing]    = useState(false);
  const [msg,           setMsg]           = useState({ text: "", ok: false });
  const [rejectMode,    setRejectMode]    = useState(false);
  const [rejectComment, setRejectComment] = useState("");

  useEffect(() => {
    setLoadingBody(true);
    setDocBody("");
    setMsg({ text: "", ok: false });
    setRejectMode(false);
    setRejectComment("");
    fetch(`/api/content/documents/${doc.id}`, { credentials: "include" })
      .then((r) => r.json())
      .then((d) => { setDocBody(d.body ?? ""); setLoadingBody(false); })
      .catch(() => setLoadingBody(false));
  }, [doc.id]);

  const reviewAction = async (action: "approve" | "reject" | "send_to_design" | "publish") => {
    setProcessing(true); setMsg({ text: "", ok: false });
    const payload: any = { id: doc.id, action };
    if (action === "reject") payload.adminComment = rejectComment;
    const res = await fetch("/api/content/documents", {
      method: "PATCH", headers: { "Content-Type": "application/json" }, credentials: "include",
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) {
      setMsg({ text: data.error || "Failed", ok: false });
    } else {
      setMsg({ text: "Done.", ok: true });
      setRejectMode(false);
      setRejectComment("");
      onStatusChange(data);
      setTimeout(onClose, 800);
    }
    setProcessing(false);
  };

  return (
    <div style={{
      position: "fixed", right: 0, top: 0, bottom: 0, width: "42%", zIndex: 200,
      background: "var(--bg)", borderLeft: "1px solid var(--border)",
      display: "flex", flexDirection: "column",
      boxShadow: "-4px 0 24px rgba(0,0,0,0.12)",
    }}>
      {/* Header */}
      <div style={{
        display: "flex", alignItems: "flex-start", gap: 10, padding: "14px 18px",
        borderBottom: "1px solid var(--border)", background: "var(--surface)", flexShrink: 0,
      }}>
        <button className="btn" onClick={onClose} style={{ fontSize: 13, flexShrink: 0, marginTop: 2 }}>✕</button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: 14.5, marginBottom: 2, lineHeight: 1.3 }}>{doc.title}</div>
          <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
            {doc.topic.title} · {doc.topic.productType} · Class {doc.topic.classFrom}–{doc.topic.classTo}
          </div>
          <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
            by {doc.author.name} · v{doc.version} ·{" "}
            <span style={{ fontWeight: 600, color: STATUS_COLOR[doc.status] }}>{doc.status.replace(/_/g, " ")}</span>
          </div>
        </div>
      </div>

      {/* Action bar */}
      {isAdmin && (
        <div style={{
          display: "flex", gap: 8, padding: "10px 18px", flexShrink: 0,
          borderBottom: "1px solid var(--border)", background: "var(--surface)", flexWrap: "wrap", alignItems: "center",
        }}>
          {doc.status === "SUBMITTED" && !rejectMode && (
            <>
              <button className="btn btn-primary" style={{ fontSize: 12.5 }}
                onClick={() => reviewAction("approve")} disabled={processing}>
                Approve
              </button>
              <button className="btn btn-danger" style={{ fontSize: 12.5 }}
                onClick={() => setRejectMode(true)} disabled={processing}>
                Reject
              </button>
            </>
          )}
          {doc.status === "APPROVED" && (
            <button className="btn" style={{ fontSize: 12.5, background: "#6366f1", color: "#fff" }}
              onClick={() => reviewAction("send_to_design")} disabled={processing}>
              Send to Design
            </button>
          )}
          {doc.status === "DESIGN_SENT" && (
            <button className="btn btn-primary" style={{ fontSize: 12.5 }}
              onClick={() => reviewAction("publish")} disabled={processing}>
              Mark Published
            </button>
          )}
          {msg.text && (
            <span style={{ fontSize: 12.5, color: msg.ok ? "var(--green)" : "var(--red)", fontWeight: 500 }}>
              {msg.text}
            </span>
          )}
        </div>
      )}

      {/* Reject form */}
      {rejectMode && (
        <div style={{
          padding: "10px 18px", flexShrink: 0,
          borderBottom: "1px solid rgba(220,38,38,0.2)",
          background: "rgba(220,38,38,0.03)",
          display: "flex", gap: 8, alignItems: "flex-start",
        }}>
          <textarea className="input" rows={2} style={{ flex: 1, fontSize: 13, resize: "vertical" }}
            value={rejectComment} onChange={(e) => setRejectComment(e.target.value)}
            placeholder="Rejection reason (required)…" autoFocus />
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <button className="btn btn-danger" style={{ fontSize: 12 }}
              onClick={() => reviewAction("reject")}
              disabled={!rejectComment.trim() || processing}>
              Confirm
            </button>
            <button className="btn" style={{ fontSize: 12 }}
              onClick={() => { setRejectMode(false); setRejectComment(""); }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Admin comment banner */}
      {doc.adminComment && (
        <div style={{
          padding: "8px 18px", flexShrink: 0,
          background: "rgba(220,38,38,0.05)", borderBottom: "1px solid rgba(220,38,38,0.12)",
          fontSize: 13, color: "var(--red)",
        }}>
          <strong>Comment:</strong> {doc.adminComment}
        </div>
      )}

      {/* Document content */}
      <div style={{ flex: 1, overflow: "auto", background: "#f1f3f4", padding: "24px 16px" }}>
        {loadingBody ? (
          <div style={{ textAlign: "center", padding: 40, color: "var(--text-muted)", fontSize: 13 }}>Loading…</div>
        ) : (
          <div style={{
            background: "#fff", margin: "0 auto", maxWidth: 700,
            padding: "48px 56px", minHeight: 600,
            boxShadow: "0 1px 3px rgba(0,0,0,0.1), 0 4px 12px rgba(0,0,0,0.06)",
            borderRadius: 4,
            fontFamily: "Georgia, serif", fontSize: "11pt", lineHeight: 1.7, color: "#202124",
          }}
            dangerouslySetInnerHTML={{ __html: docBody || "<p style='color:#aaa'>No content yet.</p>" }}
          />
        )}
      </div>
    </div>
  );
}

// ─── Main Review List Page ────────────────────────────────────────────────────
export default function ContentReviewPage() {
  const [docs,         setDocs]         = useState<Doc[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [filterStatus, setFilterStatus] = useState("SUBMITTED");
  const [openDoc,      setOpenDoc]      = useState<Doc | null>(null);
  const [isAdmin,      setIsAdmin]      = useState(false);
  const [msg,          setMsg]          = useState({ text: "", ok: false });

  useEffect(() => {
    fetch("/api/auth/me", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => {
        const modules: string[] = d.user?.modules ?? [];
        const roles: string[]   = d.user?.roles   ?? [];
        setIsAdmin(modules.includes("CONTENT_REVIEW") || modules.includes("USER_MANAGEMENT") || roles.includes("ADMIN"));
      });
  }, []);

  const fetchDocs = useCallback(async (status = filterStatus) => {
    const base = status === "ALL" ? "/api/content/documents?limit=200" : `/api/content/documents?status=${status}&limit=200`;
    const res = await fetch(base, { credentials: "include" }).then((r) => r.json());
    setDocs(Array.isArray(res) ? res : (res?.docs ?? []));
    setLoading(false);
  }, [filterStatus]);

  // Initial load + filter change
  useEffect(() => {
    setLoading(true);
    fetchDocs(filterStatus);
  }, [filterStatus]);

  // 30-second auto-poll
  useEffect(() => {
    const id = setInterval(() => { fetchDocs(filterStatus); }, 30_000);
    return () => clearInterval(id);
  }, [filterStatus, fetchDocs]);

  const handleStatusChange = (updated: Doc) => {
    setDocs((prev) => prev.map((d) => d.id === updated.id ? { ...d, ...updated } : d));
  };

  const counts = docs.reduce((acc, d) => { acc[d.status] = (acc[d.status] || 0) + 1; return acc; }, {} as Record<string, number>);

  return (
    <>
      <div className="page-header">
        <h1>Content Review</h1>
        <p>Review and publish content documents</p>
      </div>

      {msg.text && (
        <div className={`alert ${msg.ok ? "alert-success" : "alert-error"}`} style={{ marginBottom: 16 }}>{msg.text}</div>
      )}

      {/* Status tabs */}
      <div style={{ display: "flex", gap: 6, marginBottom: 20, flexWrap: "wrap" }}>
        {["SUBMITTED", "APPROVED", "REJECTED", "DESIGN_SENT", "PUBLISHED", "ALL"].map((s) => (
          <button key={s} onClick={() => setFilterStatus(s)} className="btn"
            style={{ fontSize: 12, background: filterStatus === s ? "var(--accent)" : undefined, color: filterStatus === s ? "#fff" : undefined }}>
            {s === "ALL" ? "All" : s.replace(/_/g, " ")}
            {s !== "ALL" && counts[s] ? ` (${counts[s]})` : ""}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ color: "var(--text-muted)", padding: "40px 0", textAlign: "center" }}>Loading...</div>
      ) : docs.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: 40, color: "var(--text-muted)" }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>📄</div>
          <p>No documents with status "{filterStatus === "ALL" ? "any" : filterStatus.replace(/_/g, " ")}"</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {docs.map((doc) => (
            <div key={doc.id} className="card"
              style={{
                cursor: "pointer", transition: "box-shadow 0.15s",
                outline: openDoc?.id === doc.id ? "2px solid var(--accent)" : undefined,
              }}
              onClick={() => setOpenDoc(openDoc?.id === doc.id ? null : doc)}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 4 }}>{doc.title}</div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)", display: "flex", gap: 12, flexWrap: "wrap" }}>
                    <span>Topic: {doc.topic.title}</span>
                    <span>{doc.topic.productType} · Class {doc.topic.classFrom}–{doc.topic.classTo}</span>
                    <span>Author: {doc.author.name}</span>
                    <span>v{doc.version}</span>
                    <span>Updated {timeAgo(doc.updatedAt)}</span>
                  </div>
                  {doc.adminComment && (
                    <div style={{ marginTop: 6, fontSize: 12.5, color: "var(--red)", padding: "4px 8px", background: "rgba(220,38,38,0.05)", borderRadius: 4, borderLeft: "2px solid var(--red)" }}>
                      Comment: {doc.adminComment}
                    </div>
                  )}
                </div>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8, flexShrink: 0, marginLeft: 12 }}>
                  <span style={{
                    fontSize: 11, fontWeight: 600, padding: "3px 9px", borderRadius: 99,
                    background: `${STATUS_COLOR[doc.status]}18`, color: STATUS_COLOR[doc.status],
                  }}>
                    {doc.status.replace(/_/g, " ")}
                  </span>
                  <span style={{ fontSize: 11.5, color: "var(--accent)" }}>
                    {openDoc?.id === doc.id ? "Close ✕" : "Review →"}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Side panel overlay */}
      {openDoc && (
        <ReviewSidePanel
          doc={openDoc}
          isAdmin={isAdmin}
          onClose={() => setOpenDoc(null)}
          onStatusChange={(updated) => {
            handleStatusChange(updated);
            setOpenDoc((prev) => prev ? { ...prev, ...updated } : prev);
          }}
        />
      )}
    </>
  );
}
