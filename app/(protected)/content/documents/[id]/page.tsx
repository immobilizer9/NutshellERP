"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";

const STATUS_BADGE: Record<string, string> = {
  DRAFT:       "badge-gray",
  SUBMITTED:   "badge-yellow",
  APPROVED:    "badge-green",
  REJECTED:    "badge-red",
  DESIGN_SENT: "badge-indigo",
  PUBLISHED:   "badge-blue",
};

const PRODUCT_LABELS: Record<string, string> = {
  ANNUAL:            "Annual",
  PAPERBACKS_PLAINS: "Paperbacks (Plains)",
  PAPERBACKS_HILLS:  "Paperbacks (Hills)",
  ONLINE:            "Online",
};

function ToolbarButton({ label, onClick, title }: { label: string; onClick: () => void; title?: string }) {
  return (
    <button
      onMouseDown={(e) => { e.preventDefault(); onClick(); }}
      title={title ?? label}
      style={{
        padding: "4px 10px",
        fontSize: 12,
        fontWeight: 600,
        border: "1px solid var(--border)",
        borderRadius: 4,
        background: "var(--surface)",
        color: "var(--text-primary)",
        cursor: "pointer",
        userSelect: "none",
      }}
    >
      {label}
    </button>
  );
}

export default function DocumentEditorPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const editorRef = useRef<HTMLDivElement>(null);
  const [doc,     setDoc]     = useState<any>(null);
  const [title,   setTitle]   = useState("");
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);
  const [msg,     setMsg]     = useState("");
  const [error,   setError]   = useState("");

  useEffect(() => {
    if (!id) return;
    fetch(`/api/content/documents?id=${id}`, { credentials: "include" })
      .then((r) => r.json())
      .then((d) => {
        if (d.error) { setError(d.error); return; }
        setDoc(d);
        setTitle(d.title);
        // Set editor content once after load
        setTimeout(() => {
          if (editorRef.current) {
            editorRef.current.innerHTML = d.body ?? "";
          }
        }, 0);
      })
      .finally(() => setLoading(false));
  }, [id]);

  async function save(action?: string) {
    if (!doc) return;
    setSaving(true);
    setMsg("");
    setError("");
    try {
      const body: any = { id: doc.id };
      if (action) {
        body.action = action;
      } else {
        body.title = title;
        body.docBody = editorRef.current?.innerHTML ?? "";
      }
      const res = await fetch("/api/content/documents", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Failed to save"); return; }
      setDoc(data);
      setTitle(data.title);
      setMsg(action === "submit" ? "Submitted for review!" : "Saved successfully.");
    } finally {
      setSaving(false);
    }
  }

  function exec(command: string, value?: string) {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
  }

  function downloadExport() {
    window.open(`/api/content/documents/export?id=${id}`, "_blank");
  }

  if (loading) return <p style={{ color: "var(--text-muted)" }}>Loading...</p>;
  if (error)   return <div style={{ color: "var(--red)", padding: 20 }}>{error}</div>;
  if (!doc)    return <div style={{ color: "var(--text-muted)", padding: 20 }}>Document not found.</div>;

  const isReadOnly    = doc.status === "DESIGN_SENT" || doc.status === "PUBLISHED" || doc.status === "APPROVED" || doc.status === "SUBMITTED";
  const canSubmit     = doc.status === "DRAFT" || doc.status === "REJECTED";
  const canEdit       = doc.status === "DRAFT" || doc.status === "REJECTED";

  return (
    <>
      {/* Header */}
      <div className="page-header">
        <div style={{ display: "flex", alignItems: "flex-start", gap: 12, flex: 1 }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
              <span className={`badge ${STATUS_BADGE[doc.status] ?? "badge-gray"}`}>{doc.status}</span>
              <span className="badge badge-blue">{PRODUCT_LABELS[doc.topic?.productType] ?? doc.topic?.productType}</span>
              <span className="badge badge-gray">Class {doc.topic?.classFrom}–{doc.topic?.classTo}</span>
            </div>
            <p style={{ fontSize: 13, color: "var(--text-muted)", margin: 0 }}>
              Topic: {doc.topic?.title}
              {doc.topic?.dueDate && ` · Due: ${new Date(doc.topic.dueDate).toLocaleDateString("en-IN")}`}
            </p>
          </div>
          <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
            {!isReadOnly && (
              <button className="btn btn-secondary" onClick={() => save()} disabled={saving}>
                {saving ? "Saving..." : "Save Draft"}
              </button>
            )}
            {canSubmit && (
              <button className="btn btn-primary" onClick={() => save("submit")} disabled={saving}>
                Submit for Review
              </button>
            )}
            <button className="btn btn-ghost" onClick={downloadExport} style={{ fontSize: 13 }}>
              Export HTML
            </button>
          </div>
        </div>
      </div>

      {msg   && <div style={{ background: "var(--green-bg, #dcfce7)", color: "var(--green)", border: "1px solid var(--green)", borderRadius: "var(--radius)", padding: "10px 14px", marginBottom: 16, fontSize: 14 }}>{msg}</div>}
      {error && <div style={{ background: "#fef2f2", color: "var(--red)", border: "1px solid var(--red)", borderRadius: "var(--radius)", padding: "10px 14px", marginBottom: 16, fontSize: 14 }}>{error}</div>}

      {/* Rejection reason */}
      {doc.status === "REJECTED" && doc.adminComment && (
        <div style={{ background: "#fef2f2", border: "1px solid #fca5a5", borderLeft: "4px solid var(--red)", borderRadius: "var(--radius)", padding: "14px 16px", marginBottom: 20 }}>
          <p style={{ fontWeight: 700, color: "var(--red)", margin: "0 0 4px", fontSize: 13, textTransform: "uppercase", letterSpacing: "0.05em" }}>Rejected — Admin Feedback</p>
          <p style={{ color: "#991b1b", margin: 0, fontSize: 14, lineHeight: 1.6 }}>{doc.adminComment}</p>
        </div>
      )}

      {/* Design sent / published info */}
      {(doc.status === "DESIGN_SENT" || doc.status === "PUBLISHED") && (
        <div className="card" style={{ marginBottom: 16 }}>
          <p style={{ fontWeight: 600, margin: "0 0 8px" }}>
            {doc.status === "DESIGN_SENT" ? "Sent to Design Team" : "Published"}
          </p>
          {doc.designedFileUrl && (
            <a href={doc.designedFileUrl} target="_blank" rel="noopener noreferrer" className="btn btn-secondary" style={{ fontSize: 13 }}>
              View Designed File: {doc.designedFileName ?? "Download"}
            </a>
          )}
          {doc.adminComment && (
            <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 10 }}>
              <strong>Note:</strong> {doc.adminComment}
            </p>
          )}
        </div>
      )}

      {/* Title */}
      <div style={{ marginBottom: 16 }}>
        {canEdit ? (
          <input
            className="input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Document title..."
            style={{ fontSize: 18, fontWeight: 600, width: "100%" }}
          />
        ) : (
          <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>{doc.title}</h2>
        )}
      </div>

      {/* Rich text editor */}
      {canEdit ? (
        <div className="card" style={{ padding: 0 }}>
          {/* Toolbar */}
          <div style={{
            display: "flex", gap: 4, padding: "10px 14px",
            borderBottom: "1px solid var(--border)", flexWrap: "wrap", alignItems: "center",
          }}>
            <ToolbarButton label="B"   title="Bold"            onClick={() => exec("bold")} />
            <ToolbarButton label="I"   title="Italic"          onClick={() => exec("italic")} />
            <ToolbarButton label="U"   title="Underline"       onClick={() => exec("underline")} />
            <span style={{ width: 1, height: 20, background: "var(--border)", margin: "0 4px" }} />
            <ToolbarButton label="H1"  title="Heading 1"       onClick={() => exec("formatBlock", "h1")} />
            <ToolbarButton label="H2"  title="Heading 2"       onClick={() => exec("formatBlock", "h2")} />
            <ToolbarButton label="P"   title="Paragraph"       onClick={() => exec("formatBlock", "p")} />
            <span style={{ width: 1, height: 20, background: "var(--border)", margin: "0 4px" }} />
            <ToolbarButton label="• List"  title="Bullet List"    onClick={() => exec("insertUnorderedList")} />
            <ToolbarButton label="1. List" title="Numbered List"   onClick={() => exec("insertOrderedList")} />
          </div>
          {/* Editor area */}
          <div
            ref={editorRef}
            contentEditable
            suppressContentEditableWarning
            style={{
              minHeight: 400,
              padding: "20px 24px",
              outline: "none",
              fontSize: 15,
              lineHeight: 1.8,
              color: "var(--text-primary)",
            }}
          />
        </div>
      ) : (
        <div className="card">
          <div
            style={{ fontSize: 15, lineHeight: 1.8, color: "var(--text-primary)" }}
            dangerouslySetInnerHTML={{ __html: doc.body || "<p><em>No content yet.</em></p>" }}
          />
        </div>
      )}
    </>
  );
}
