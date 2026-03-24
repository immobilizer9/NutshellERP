"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import { TextStyle } from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import Highlight from "@tiptap/extension-highlight";

// ─── Types ────────────────────────────────────────────────────────────────────
type Doc = {
  id: string; title: string; status: string; version: number;
  adminComment: string | null; updatedAt: string; createdAt: string;
  topic: { id: string; title: string; productType: string; classFrom: number; classTo: number };
  author: { id: string; name: string; email: string };
};

type Comment = {
  id: string; quotedText: string; body: string; resolved: boolean;
  createdAt: string; author: { id: string; name: string };
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function timeAgo(d: string) {
  const diff = Date.now() - new Date(d).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

const STATUS_COLOR: Record<string, string> = {
  DRAFT: "var(--text-muted)", SUBMITTED: "var(--yellow)", APPROVED: "var(--green)",
  REJECTED: "var(--red)", DESIGN_SENT: "#6366f1", PUBLISHED: "var(--accent)",
};

/** Wrap all occurrences of quotedText in the HTML with a highlight span */
function injectHighlights(html: string, comments: Comment[]): string {
  let result = html;
  const active = comments.filter((c) => !c.resolved && c.quotedText);
  // Process longest matches first to avoid partial-replace collisions
  const sorted = [...active].sort((a, b) => b.quotedText.length - a.quotedText.length);
  for (const c of sorted) {
    const escaped = c.quotedText.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(escaped, "g");
    result = result.replace(re,
      `<mark class="doc-comment-highlight" data-cid="${c.id}" style="background:rgba(251,191,36,0.4);border-bottom:2px solid #f59e0b;cursor:pointer;border-radius:2px;padding:1px 0">${c.quotedText}</mark>`
    );
  }
  return result;
}

// ─── Sub-component: Review Panel (shown when a doc is open) ──────────────────
function ReviewPanel({
  doc, onClose, onStatusChange, isAdmin, currentUserId,
}: {
  doc: Doc; onClose: () => void; onStatusChange: () => void;
  isAdmin: boolean; currentUserId: string;
}) {
  const [comments,      setComments]      = useState<Comment[]>([]);
  const [loadingCmts,   setLoadingCmts]   = useState(true);
  const [docBody,       setDocBody]       = useState("");
  const [editMode,      setEditMode]      = useState(false);
  const [savingEdit,    setSavingEdit]    = useState(false);
  const [activeCommentId, setActiveCommentId] = useState<string | null>(null);

  // floating comment popup
  const [selection,    setSelection]    = useState<{ text: string; x: number; y: number } | null>(null);
  const [commentInput, setCommentInput] = useState("");
  const [submittingCmt, setSubmittingCmt] = useState(false);

  // review actions
  const [actionState,  setActionState]  = useState<"idle" | "rejecting">("idle");
  const [rejectComment, setRejectComment] = useState("");
  const [processing,   setProcessing]   = useState(false);
  const [msg,          setMsg]          = useState({ text: "", ok: false });
  const [showAll,      setShowAll]      = useState(false);

  const docContentRef = useRef<HTMLDivElement>(null);
  const panelRef      = useRef<HTMLDivElement>(null);

  // TipTap editor (only active in editMode)
  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      TextStyle,
      Color,
      Highlight.configure({ multicolor: true }),
    ],
    content: "",
    immediatelyRender: false,
    editable: true,
  });

  // ── Load doc body + comments ──────────────────────────────────────
  useEffect(() => {
    fetch(`/api/content/documents/${doc.id}`, { credentials: "include" })
      .then((r) => r.json())
      .then((d) => {
        setDocBody(d.body ?? "");
        if (editor) editor.commands.setContent(d.body ?? "");
      });

    setLoadingCmts(true);
    fetch(`/api/content/documents/${doc.id}/comments`, { credentials: "include" })
      .then((r) => r.json())
      .then((d) => { setComments(Array.isArray(d) ? d : []); setLoadingCmts(false); });
  }, [doc.id]);

  // Keep editor in sync when body loads
  useEffect(() => {
    if (editor && docBody && editMode) editor.commands.setContent(docBody);
  }, [editMode, docBody]);

  // ── Click on highlight in rendered HTML ──────────────────────────
  useEffect(() => {
    const el = docContentRef.current;
    if (!el) return;
    const handler = (e: MouseEvent) => {
      const mark = (e.target as HTMLElement).closest("[data-cid]") as HTMLElement | null;
      if (mark) {
        const cid = mark.getAttribute("data-cid");
        setActiveCommentId(cid);
        // scroll to comment in panel
        const cmtEl = panelRef.current?.querySelector(`[data-comment-id="${cid}"]`);
        cmtEl?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
    };
    el.addEventListener("click", handler);
    return () => el.removeEventListener("click", handler);
  }, [comments, docBody]);

  // ── Text selection → floating Add Comment button ─────────────────
  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    if (editMode) return;
    const sel = window.getSelection();
    const text = sel?.toString().trim() ?? "";
    if (text.length < 2) { setSelection(null); return; }
    const range = sel!.getRangeAt(0);
    const rect  = range.getBoundingClientRect();
    const containerRect = docContentRef.current?.getBoundingClientRect();
    if (!containerRect) return;
    setSelection({
      text,
      x: rect.left - containerRect.left + rect.width / 2,
      y: rect.top  - containerRect.top  - 44,
    });
    setCommentInput("");
  }, [editMode]);

  const submitComment = async () => {
    if (!selection || !commentInput.trim()) return;
    setSubmittingCmt(true);
    const res = await fetch(`/api/content/documents/${doc.id}/comments`, {
      method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
      body: JSON.stringify({ quotedText: selection.text, body: commentInput }),
    });
    if (res.ok) {
      const newCmt = await res.json();
      setComments((prev) => [...prev, newCmt]);
      setSelection(null); setCommentInput("");
    }
    setSubmittingCmt(false);
  };

  const resolveComment = async (cid: string) => {
    const res = await fetch(`/api/content/documents/${doc.id}/comments`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, credentials: "include",
      body: JSON.stringify({ commentId: cid }),
    });
    if (res.ok) {
      const updated = await res.json();
      setComments((prev) => prev.map((c) => c.id === cid ? updated : c));
      if (activeCommentId === cid) setActiveCommentId(null);
    }
  };

  const deleteComment = async (cid: string) => {
    await fetch(`/api/content/documents/${doc.id}/comments`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, credentials: "include",
      body: JSON.stringify({ commentId: cid, action: "delete" }),
    });
    setComments((prev) => prev.filter((c) => c.id !== cid));
    if (activeCommentId === cid) setActiveCommentId(null);
  };

  const saveEdit = async () => {
    if (!editor) return;
    setSavingEdit(true);
    const newBody = editor.getHTML();
    const res = await fetch(`/api/content/documents/${doc.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, credentials: "include",
      body: JSON.stringify({ docBody: newBody }),
    });
    if (res.ok) {
      setDocBody(newBody);
      setEditMode(false);
      setMsg({ text: "Document saved.", ok: true });
      setTimeout(() => setMsg({ text: "", ok: false }), 2000);
    }
    setSavingEdit(false);
  };

  const reviewAction = async (action: "approve" | "reject" | "send_design" | "publish") => {
    setProcessing(true); setMsg({ text: "", ok: false });
    const body: any = { id: doc.id };
    if (action === "approve")     body.action = "approve";
    if (action === "reject")      { body.action = "reject"; body.adminComment = rejectComment; }
    if (action === "send_design") body.action = "send_to_design";
    if (action === "publish")     body.action = "publish";
    const res = await fetch("/api/content/documents", {
      method: "PATCH", headers: { "Content-Type": "application/json" }, credentials: "include",
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) { setMsg({ text: data.error || "Failed", ok: false }); }
    else {
      setMsg({ text: `Document ${action}d.`, ok: true });
      setActionState("idle"); setRejectComment("");
      onStatusChange();
      setTimeout(onClose, 1200);
    }
    setProcessing(false);
  };

  const openComments  = comments.filter((c) => !c.resolved);
  const closedComments = comments.filter((c) => c.resolved);
  const highlightedHtml = injectHighlights(docBody, comments);

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 100,
      background: "var(--bg)", display: "flex", flexDirection: "column",
    }}>
      {/* ── Top bar ── */}
      <div style={{
        display: "flex", alignItems: "center", gap: 12, padding: "10px 20px",
        borderBottom: "1px solid var(--border)", background: "var(--surface)", flexShrink: 0,
      }}>
        <button className="btn" onClick={onClose} style={{ fontSize: 13 }}>← Back</button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: 15, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{doc.title}</div>
          <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
            {doc.topic.title} · {doc.author.name} · v{doc.version}
            <span style={{ marginLeft: 8, fontWeight: 600, color: STATUS_COLOR[doc.status] }}>{doc.status.replace("_", " ")}</span>
          </div>
        </div>

        {msg.text && (
          <span style={{ fontSize: 12.5, color: msg.ok ? "var(--green)" : "var(--red)", fontWeight: 500 }}>{msg.text}</span>
        )}

        {/* Admin edit toggle */}
        {isAdmin && (
          editMode ? (
            <div style={{ display: "flex", gap: 6 }}>
              <button className="btn" onClick={() => setEditMode(false)} style={{ fontSize: 12.5 }}>Cancel Edit</button>
              <button className="btn btn-primary" onClick={saveEdit} disabled={savingEdit} style={{ fontSize: 12.5 }}>
                {savingEdit ? "Saving…" : "Save Edits"}
              </button>
            </div>
          ) : (
            <button className="btn" onClick={() => setEditMode(true)} style={{ fontSize: 12.5, background: "rgba(99,102,241,0.08)", color: "var(--accent)", border: "1px solid rgba(99,102,241,0.25)" }}>
              ✏️ Edit Document
            </button>
          )
        )}

        {/* Review action buttons */}
        {isAdmin && !editMode && (
          <div style={{ display: "flex", gap: 6 }}>
            {doc.status === "SUBMITTED" && (
              <>
                <button className="btn btn-primary" style={{ fontSize: 12.5 }}
                  onClick={() => reviewAction("approve")} disabled={processing}>Approve</button>
                <button className="btn btn-danger" style={{ fontSize: 12.5 }}
                  onClick={() => setActionState(actionState === "rejecting" ? "idle" : "rejecting")}>Reject</button>
              </>
            )}
            {doc.status === "APPROVED" && (
              <button className="btn" style={{ fontSize: 12.5, background: "var(--accent)", color: "#fff" }}
                onClick={() => reviewAction("send_design")} disabled={processing}>Send to Design</button>
            )}
            {doc.status === "DESIGN_SENT" && (
              <button className="btn btn-primary" style={{ fontSize: 12.5 }}
                onClick={() => reviewAction("publish")} disabled={processing}>Mark Published</button>
            )}
          </div>
        )}
      </div>

      {/* Reject form */}
      {actionState === "rejecting" && (
        <div style={{ padding: "10px 20px", background: "rgba(220,38,38,0.04)", borderBottom: "1px solid rgba(220,38,38,0.15)", display: "flex", gap: 8, alignItems: "flex-start" }}>
          <textarea className="input" rows={2} style={{ flex: 1, fontSize: 13 }}
            value={rejectComment} onChange={(e) => setRejectComment(e.target.value)}
            placeholder="Rejection reason (required)…" />
          <button className="btn btn-danger" style={{ fontSize: 12.5 }}
            onClick={() => reviewAction("reject")} disabled={!rejectComment.trim() || processing}>
            Confirm Reject
          </button>
          <button className="btn" style={{ fontSize: 12.5 }} onClick={() => setActionState("idle")}>Cancel</button>
        </div>
      )}

      {doc.adminComment && (
        <div style={{ padding: "8px 20px", background: "rgba(220,38,38,0.05)", borderBottom: "1px solid rgba(220,38,38,0.1)", fontSize: 13, color: "var(--red)" }}>
          Previous comment: {doc.adminComment}
        </div>
      )}

      {/* ── Main body: doc content + comments sidebar ── */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>

        {/* Left: Document */}
        <div style={{ flex: 1, overflow: "auto", background: "#f1f3f4", padding: "32px 24px" }}>
          <div style={{
            maxWidth: 816, margin: "0 auto", background: "#fff",
            boxShadow: "0 1px 3px rgba(0,0,0,0.12), 0 4px 16px rgba(0,0,0,0.06)",
            borderRadius: 4, minHeight: 1056, padding: "72px 96px", position: "relative",
          }}>
            {!editMode ? (
              <div
                ref={docContentRef}
                className="prose-content"
                onMouseUp={handleMouseUp}
                style={{ lineHeight: 1.8, fontSize: 14.5, color: "#202124", userSelect: "text", position: "relative" }}
                dangerouslySetInnerHTML={{ __html: highlightedHtml || "<p style='color:#aaa'>No content yet.</p>" }}
              />
            ) : (
              <EditorContent editor={editor} style={{ lineHeight: 1.8, fontSize: 14.5, color: "#202124", minHeight: 600 }} />
            )}

            {/* Floating "Add Comment" popup */}
            {selection && !editMode && (
              <div style={{
                position: "absolute", left: selection.x, top: selection.y,
                transform: "translateX(-50%)", zIndex: 10,
                background: "var(--surface)", border: "1px solid var(--border)",
                borderRadius: 8, padding: 12, boxShadow: "0 8px 24px rgba(0,0,0,0.15)",
                minWidth: 260,
              }}>
                <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 6 }}>
                  Comment on: <em style={{ color: "var(--text-primary)", fontStyle: "italic" }}>
                    "{selection.text.length > 40 ? selection.text.slice(0, 40) + "…" : selection.text}"
                  </em>
                </div>
                <textarea className="input" rows={3} style={{ fontSize: 13, width: "100%", resize: "vertical" }}
                  value={commentInput} onChange={(e) => setCommentInput(e.target.value)}
                  placeholder="Add a comment…" autoFocus />
                <div style={{ display: "flex", gap: 6, marginTop: 8, justifyContent: "flex-end" }}>
                  <button className="btn" style={{ fontSize: 12 }} onClick={() => { setSelection(null); setCommentInput(""); }}>Cancel</button>
                  <button className="btn btn-primary" style={{ fontSize: 12 }}
                    disabled={!commentInput.trim() || submittingCmt} onClick={submitComment}>
                    {submittingCmt ? "Posting…" : "Add Comment"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right: Comments Sidebar */}
        <div ref={panelRef} style={{
          width: 320, flexShrink: 0, borderLeft: "1px solid var(--border)",
          background: "var(--surface)", overflow: "auto", display: "flex", flexDirection: "column",
        }}>
          <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ fontWeight: 600, fontSize: 13.5 }}>
              Comments
              {openComments.length > 0 && (
                <span style={{ marginLeft: 6, background: "var(--red)", color: "#fff", borderRadius: 99, fontSize: 11, padding: "1px 6px", fontWeight: 700 }}>
                  {openComments.length}
                </span>
              )}
            </div>
            {!editMode && (
              <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Select text to add</div>
            )}
          </div>

          {loadingCmts ? (
            <div style={{ padding: 16, color: "var(--text-muted)", fontSize: 13 }}>Loading…</div>
          ) : comments.length === 0 ? (
            <div style={{ padding: 24, textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>💬</div>
              No comments yet.{!editMode && <><br />Select text to add one.</>}
            </div>
          ) : (
            <div style={{ flex: 1, overflow: "auto" }}>
              {/* Open comments */}
              {openComments.map((c) => (
                <div key={c.id} data-comment-id={c.id}
                  onClick={() => setActiveCommentId(activeCommentId === c.id ? null : c.id)}
                  style={{
                    padding: "12px 16px", borderBottom: "1px solid var(--border-soft)",
                    cursor: "pointer", transition: "background 0.1s",
                    background: activeCommentId === c.id ? "rgba(99,102,241,0.06)" : "transparent",
                    borderLeft: activeCommentId === c.id ? "3px solid var(--accent)" : "3px solid transparent",
                  }}>
                  {/* Quoted text */}
                  <div style={{ fontSize: 12, padding: "3px 8px", background: "rgba(251,191,36,0.15)", borderLeft: "2px solid #f59e0b", marginBottom: 6, borderRadius: 2, color: "#92400e", fontStyle: "italic" }}>
                    "{c.quotedText.length > 60 ? c.quotedText.slice(0, 60) + "…" : c.quotedText}"
                  </div>
                  <div style={{ fontSize: 13, lineHeight: 1.5, marginBottom: 6 }}>{c.body}</div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                      <strong>{c.author.name}</strong> · {timeAgo(c.createdAt)}
                    </span>
                    <div style={{ display: "flex", gap: 4 }}>
                      <button className="btn" style={{ fontSize: 11, padding: "2px 7px", color: "var(--green)" }}
                        onClick={(e) => { e.stopPropagation(); resolveComment(c.id); }}
                        title="Mark resolved">✓</button>
                      {(isAdmin || c.author.id === currentUserId) && (
                        <button className="btn" style={{ fontSize: 11, padding: "2px 7px", color: "var(--red)" }}
                          onClick={(e) => { e.stopPropagation(); deleteComment(c.id); }}
                          title="Delete">✕</button>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {/* Resolved comments toggle */}
              {closedComments.length > 0 && (
                <>
                  <button onClick={() => setShowAll(!showAll)}
                    style={{ width: "100%", padding: "8px 16px", background: "none", border: "none", borderTop: "1px solid var(--border)", cursor: "pointer", fontSize: 12, color: "var(--text-muted)", textAlign: "left" }}>
                    {showAll ? "▲" : "▼"} {closedComments.length} resolved comment{closedComments.length !== 1 ? "s" : ""}
                  </button>
                  {showAll && closedComments.map((c) => (
                    <div key={c.id} style={{ padding: "10px 16px", borderBottom: "1px solid var(--border-soft)", opacity: 0.55 }}>
                      <div style={{ fontSize: 12, fontStyle: "italic", color: "var(--text-muted)", marginBottom: 4 }}>
                        "{c.quotedText.length > 50 ? c.quotedText.slice(0, 50) + "…" : c.quotedText}"
                      </div>
                      <div style={{ fontSize: 12.5 }}>{c.body}</div>
                      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
                        <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{c.author.name} · resolved</span>
                        <button className="btn" style={{ fontSize: 11, padding: "2px 7px" }}
                          onClick={() => resolveComment(c.id)} title="Re-open">Re-open</button>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Review List Page ────────────────────────────────────────────────────
export default function ContentReviewPage() {
  const [docs,         setDocs]         = useState<Doc[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [filterStatus, setFilterStatus] = useState("SUBMITTED");
  const [processing,   setProcessing]   = useState<string | null>(null);
  const [msg,          setMsg]          = useState({ text: "", ok: false });
  const [openDoc,      setOpenDoc]      = useState<Doc | null>(null);
  const [isAdmin,      setIsAdmin]      = useState(false);
  const [currentUserId, setCurrentUserId] = useState("");

  useEffect(() => {
    fetch("/api/auth/me", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => {
        setIsAdmin(d.user?.roles?.includes("ADMIN") ?? false);
        setCurrentUserId(d.user?.id ?? "");
      });
  }, []);

  const fetchDocs = async (status = filterStatus) => {
    setLoading(true);
    const url = status === "ALL" ? "/api/content/documents" : `/api/content/documents?status=${status}`;
    const res = await fetch(url, { credentials: "include" }).then((r) => r.json());
    setDocs(Array.isArray(res) ? res : []);
    setLoading(false);
  };

  useEffect(() => { fetchDocs(filterStatus); }, [filterStatus]);

  // Quick-action without opening the panel (bulk approve/reject from list)
  const quickReview = async (docId: string, action: "approve" | "reject" | "send_design" | "publish") => {
    setProcessing(docId); setMsg({ text: "", ok: false });
    const body: any = { id: docId, action: action === "send_design" ? "send_to_design" : action };
    const res  = await fetch("/api/content/documents", {
      method: "PATCH", headers: { "Content-Type": "application/json" }, credentials: "include",
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) { setMsg({ text: data.error || "Failed", ok: false }); }
    else {
      setMsg({ text: `Document ${action}d.`, ok: true });
      fetchDocs(filterStatus);
    }
    setProcessing(null);
  };

  const counts = docs.reduce((acc, d) => { acc[d.status] = (acc[d.status] || 0) + 1; return acc; }, {} as Record<string, number>);

  // If a doc is open in the review panel, show it fullscreen
  if (openDoc) {
    return (
      <ReviewPanel
        doc={openDoc}
        isAdmin={isAdmin}
        currentUserId={currentUserId}
        onClose={() => { setOpenDoc(null); fetchDocs(filterStatus); }}
        onStatusChange={() => fetchDocs(filterStatus)}
      />
    );
  }

  return (
    <>
      <div className="page-header">
        <h1>Content Review</h1>
        <p>Review, annotate, and publish content documents</p>
      </div>

      {msg.text && (
        <div className={`alert ${msg.ok ? "alert-success" : "alert-error"}`} style={{ marginBottom: 16 }}>{msg.text}</div>
      )}

      {/* Status tabs */}
      <div style={{ display: "flex", gap: 6, marginBottom: 20, flexWrap: "wrap" }}>
        {["SUBMITTED", "APPROVED", "REJECTED", "DESIGN_SENT", "PUBLISHED", "ALL"].map((s) => (
          <button key={s} onClick={() => setFilterStatus(s)} className="btn"
            style={{ fontSize: 12, background: filterStatus === s ? "var(--accent)" : undefined, color: filterStatus === s ? "#fff" : undefined }}>
            {s === "ALL" ? "All" : s.replace("_", " ")}
            {s !== "ALL" && counts[s] ? ` (${counts[s]})` : ""}
          </button>
        ))}
      </div>

      {loading ? (
        <p style={{ color: "var(--text-muted)" }}>Loading…</p>
      ) : docs.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: 40, color: "var(--text-muted)" }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>📄</div>
          <p>No documents with status "{filterStatus === "ALL" ? "any" : filterStatus}"</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {docs.map((doc) => (
            <div key={doc.id} className="card"
              style={{ cursor: "pointer", transition: "box-shadow 0.15s" }}
              onClick={() => setOpenDoc(doc)}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 4 }}>{doc.title}</div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)", display: "flex", gap: 12, flexWrap: "wrap" }}>
                    <span>Topic: {doc.topic.title}</span>
                    <span>{doc.topic.productType} · Class {doc.topic.classFrom}–{doc.topic.classTo}</span>
                    <span>Author: {doc.author.name}</span>
                    <span>v{doc.version}</span>
                    <span>Updated {formatDate(doc.updatedAt)}</span>
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
                    {doc.status.replace("_", " ")}
                  </span>
                  {/* Quick actions for admin — stop propagation so it doesn't open panel */}
                  {isAdmin && (
                    <div style={{ display: "flex", gap: 6 }} onClick={(e) => e.stopPropagation()}>
                      <button className="btn" style={{ fontSize: 11.5, padding: "3px 10px" }}
                        onClick={() => setOpenDoc(doc)}>Review →</button>
                      {doc.status === "SUBMITTED" && (
                        <button className="btn btn-primary" style={{ fontSize: 11.5, padding: "3px 10px" }}
                          onClick={() => quickReview(doc.id, "approve")} disabled={processing === doc.id}>
                          Approve
                        </button>
                      )}
                      {doc.status === "APPROVED" && (
                        <button className="btn" style={{ fontSize: 11.5, padding: "3px 10px", background: "var(--accent)", color: "#fff" }}
                          onClick={() => quickReview(doc.id, "send_design")} disabled={processing === doc.id}>
                          → Design
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
