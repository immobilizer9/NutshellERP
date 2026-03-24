"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import CharacterCount from "@tiptap/extension-character-count";
import Typography from "@tiptap/extension-typography";
import Highlight from "@tiptap/extension-highlight";
import { TextStyle } from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";

/* ─── badge colours ──────────────────────────────────────────────────────── */
const STATUS_BADGE: Record<string, string> = {
  DRAFT:       "badge-gray",
  SUBMITTED:   "badge-yellow",
  APPROVED:    "badge-green",
  REJECTED:    "badge-red",
  DESIGN_SENT: "badge-indigo",
  PUBLISHED:   "badge-blue",
};

const STATUS_LABEL: Record<string, string> = {
  DRAFT: "Draft", SUBMITTED: "In Review", APPROVED: "Approved",
  REJECTED: "Rejected", DESIGN_SENT: "At Design", PUBLISHED: "Published",
};

/* ─── SVG icon helper ────────────────────────────────────────────────────── */
function Icon({ d, size = 16 }: { d: string; size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  );
}

/* ─── Toolbar button ─────────────────────────────────────────────────────── */
function Btn({
  onClick, active = false, title, children, disabled = false,
}: {
  onClick: () => void; active?: boolean; title: string;
  children: React.ReactNode; disabled?: boolean;
}) {
  return (
    <button
      onMouseDown={(e) => { e.preventDefault(); onClick(); }}
      title={title}
      disabled={disabled}
      style={{
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        width: 28, height: 28, borderRadius: 4, border: "none", cursor: disabled ? "not-allowed" : "pointer",
        background: active ? "rgba(99,102,241,0.12)" : "transparent",
        color: active ? "#6366f1" : "var(--text-primary)",
        opacity: disabled ? 0.4 : 1,
        transition: "background 0.1s",
        flexShrink: 0,
      }}
    >
      {children}
    </button>
  );
}

/* separator */
const Sep = () => (
  <span style={{ width: 1, height: 20, background: "var(--border)", margin: "0 2px", flexShrink: 0 }} />
);

/* ─── Toolbar ────────────────────────────────────────────────────────────── */
function Toolbar({ editor, readOnly }: { editor: any; readOnly: boolean }) {
  if (!editor) return null;

  const TEXT_COLORS = ["#000000","#ef4444","#f97316","#eab308","#22c55e","#3b82f6","#8b5cf6","#ec4899"];

  function setLink() {
    const prev = editor.getAttributes("link").href;
    const url = window.prompt("Enter URL", prev ?? "https://");
    if (url === null) return;
    if (url === "") { editor.chain().focus().unsetLink().run(); return; }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url, target: "_blank" }).run();
  }

  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 2, padding: "6px 12px",
      borderBottom: "1px solid var(--border)", flexWrap: "wrap",
      background: "var(--surface)", position: "sticky", top: 0, zIndex: 10,
      backdropFilter: "blur(4px)",
    }}>
      {/* History */}
      <Btn title="Undo (Ctrl+Z)" onClick={() => editor.chain().focus().undo().run()}
        disabled={readOnly || !editor.can().undo()}>
        <Icon d="M9 14 4 9l5-5M4 9h11a4 4 0 0 1 0 8h-1" />
      </Btn>
      <Btn title="Redo (Ctrl+Y)" onClick={() => editor.chain().focus().redo().run()}
        disabled={readOnly || !editor.can().redo()}>
        <Icon d="M15 14l5-5-5-5m5 5H9a4 4 0 0 0 0 8h1" />
      </Btn>

      <Sep />

      {/* Text style */}
      <Btn title="Bold (Ctrl+B)" active={editor.isActive("bold")}
        onClick={() => editor.chain().focus().toggleBold().run()} disabled={readOnly}>
        <strong style={{ fontSize: 13 }}>B</strong>
      </Btn>
      <Btn title="Italic (Ctrl+I)" active={editor.isActive("italic")}
        onClick={() => editor.chain().focus().toggleItalic().run()} disabled={readOnly}>
        <em style={{ fontSize: 13 }}>I</em>
      </Btn>
      <Btn title="Underline (Ctrl+U)" active={editor.isActive("underline")}
        onClick={() => editor.chain().focus().toggleUnderline().run()} disabled={readOnly}>
        <span style={{ fontSize: 13, textDecoration: "underline" }}>U</span>
      </Btn>
      <Btn title="Strikethrough" active={editor.isActive("strike")}
        onClick={() => editor.chain().focus().toggleStrike().run()} disabled={readOnly}>
        <span style={{ fontSize: 12, textDecoration: "line-through" }}>S</span>
      </Btn>

      <Sep />

      {/* Highlight */}
      <Btn title="Highlight" active={editor.isActive("highlight")}
        onClick={() => editor.chain().focus().toggleHighlight({ color: "#fef08a" }).run()} disabled={readOnly}>
        <span style={{ fontSize: 11, background: "#fef08a", color: "#000", padding: "1px 3px", borderRadius: 2 }}>H</span>
      </Btn>

      {/* Text colour */}
      <span title="Text Color" style={{ position: "relative", display: "inline-flex" }}>
        <select
          disabled={readOnly}
          style={{
            appearance: "none", width: 28, height: 28, padding: 0, paddingLeft: 4,
            border: "none", background: "transparent", cursor: "pointer",
            fontSize: 12, color: "var(--text-primary)",
          }}
          defaultValue=""
          onChange={(e) => {
            const v = e.target.value;
            if (v) { editor.chain().focus().setColor(v).run(); }
            else { editor.chain().focus().unsetColor().run(); }
            e.target.value = "";
          }}
        >
          <option value="">A</option>
          {TEXT_COLORS.map((c) => (
            <option key={c} value={c} style={{ color: c }}>■ {c}</option>
          ))}
          <option value="">Clear</option>
        </select>
      </span>

      <Sep />

      {/* Headings */}
      {([1, 2, 3] as const).map((level) => (
        <Btn key={level} title={`Heading ${level}`}
          active={editor.isActive("heading", { level })}
          onClick={() => editor.chain().focus().toggleHeading({ level }).run()}
          disabled={readOnly}>
          <span style={{ fontSize: 11, fontWeight: 700 }}>H{level}</span>
        </Btn>
      ))}
      <Btn title="Paragraph" active={editor.isActive("paragraph")}
        onClick={() => editor.chain().focus().setParagraph().run()} disabled={readOnly}>
        <span style={{ fontSize: 11 }}>¶</span>
      </Btn>

      <Sep />

      {/* Alignment */}
      <Btn title="Align Left" active={editor.isActive({ textAlign: "left" })}
        onClick={() => editor.chain().focus().setTextAlign("left").run()} disabled={readOnly}>
        <Icon d="M3 6h18M3 12h12M3 18h15" size={14} />
      </Btn>
      <Btn title="Align Center" active={editor.isActive({ textAlign: "center" })}
        onClick={() => editor.chain().focus().setTextAlign("center").run()} disabled={readOnly}>
        <Icon d="M3 6h18M6 12h12M4 18h16" size={14} />
      </Btn>
      <Btn title="Align Right" active={editor.isActive({ textAlign: "right" })}
        onClick={() => editor.chain().focus().setTextAlign("right").run()} disabled={readOnly}>
        <Icon d="M3 6h18M9 12h12M6 18h15" size={14} />
      </Btn>
      <Btn title="Justify" active={editor.isActive({ textAlign: "justify" })}
        onClick={() => editor.chain().focus().setTextAlign("justify").run()} disabled={readOnly}>
        <Icon d="M3 6h18M3 12h18M3 18h18" size={14} />
      </Btn>

      <Sep />

      {/* Lists */}
      <Btn title="Bullet List" active={editor.isActive("bulletList")}
        onClick={() => editor.chain().focus().toggleBulletList().run()} disabled={readOnly}>
        <Icon d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" size={14} />
      </Btn>
      <Btn title="Numbered List" active={editor.isActive("orderedList")}
        onClick={() => editor.chain().focus().toggleOrderedList().run()} disabled={readOnly}>
        <Icon d="M10 6h11M10 12h11M10 18h11M4 6h1v4M4 10H3M6 10H4M3 18v-1a1 1 0 0 1 1-1h1a1 1 0 0 1 1 1v1m0 0H3" size={14} />
      </Btn>

      <Sep />

      {/* Block formatting */}
      <Btn title="Blockquote" active={editor.isActive("blockquote")}
        onClick={() => editor.chain().focus().toggleBlockquote().run()} disabled={readOnly}>
        <Icon d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1zm12 0c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3c0 1 0 1 1 1z" size={14} />
      </Btn>
      <Btn title="Code Block" active={editor.isActive("codeBlock")}
        onClick={() => editor.chain().focus().toggleCodeBlock().run()} disabled={readOnly}>
        <Icon d="M16 18l6-6-6-6M8 6l-6 6 6 6" size={14} />
      </Btn>
      <Btn title="Inline Code" active={editor.isActive("code")}
        onClick={() => editor.chain().focus().toggleCode().run()} disabled={readOnly}>
        <Icon d="M9 18l-5-5 5-5m6 10l5-5-5-5" size={14} />
      </Btn>

      <Sep />

      {/* Link */}
      <Btn title="Insert / Edit Link" active={editor.isActive("link")}
        onClick={setLink} disabled={readOnly}>
        <Icon d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" size={14} />
      </Btn>

      {/* Horizontal rule */}
      <Btn title="Horizontal Rule" onClick={() => editor.chain().focus().setHorizontalRule().run()} disabled={readOnly}>
        <Icon d="M5 12h14" size={14} />
      </Btn>
    </div>
  );
}

/* ─── Main editor page ───────────────────────────────────────────────────── */
export default function DocumentEditorPage() {
  const params = useParams();
  const id = params?.id as string;

  const [doc,     setDoc]     = useState<any>(null);
  const [title,   setTitle]   = useState("");
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);
  const [saveLabel, setSaveLabel] = useState("All changes saved");
  const [error,   setError]   = useState("");
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSaved     = useRef<string>("");

  /* TipTap editor instance */
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ codeBlock: { languageClassPrefix: "language-" } }),
      Underline,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Link.configure({ openOnClick: false, HTMLAttributes: { target: "_blank", rel: "noopener noreferrer" } }),
      Placeholder.configure({ placeholder: "Start writing your content here…" }),
      CharacterCount,
      Typography,
      Highlight.configure({ multicolor: true }),
      TextStyle,
      Color,
    ],
    content: "",
    editable: true,
    onUpdate: ({ editor: e }) => {
      const html = e.getHTML();
      if (html === lastSaved.current) return;
      setSaveLabel("Unsaved changes…");
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
      autoSaveTimer.current = setTimeout(() => {
        triggerSave(e.getHTML());
      }, 1800);
    },
  });

  /* Load document */
  useEffect(() => {
    if (!id) return;
    fetch(`/api/content/documents?id=${id}`, { credentials: "include" })
      .then((r) => r.json())
      .then((d) => {
        if (d.error) { setError(d.error); return; }
        setDoc(d);
        setTitle(d.title ?? "");
        if (editor) {
          editor.commands.setContent(d.body ?? "");
          lastSaved.current = editor.getHTML();
        }
      })
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, editor]);

  /* Sync readOnly */
  const canEdit = doc && (doc.status === "DRAFT" || doc.status === "REJECTED");
  useEffect(() => {
    if (editor) editor.setEditable(!!canEdit);
  }, [editor, canEdit]);

  /* Save function */
  const triggerSave = useCallback(async (html?: string) => {
    if (!doc) return;
    setSaving(true);
    try {
      const body = { id: doc.id, title, docBody: html ?? editor?.getHTML() ?? "" };
      const res = await fetch("/api/content/documents", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        credentials: "include", body: JSON.stringify(body),
      });
      const data = await res.json();
      if (res.ok) {
        setDoc((prev: any) => ({ ...prev, ...data }));
        lastSaved.current = html ?? editor?.getHTML() ?? "";
        setSaveLabel("All changes saved");
      } else {
        setSaveLabel("Save failed");
      }
    } finally {
      setSaving(false);
    }
  }, [doc, title, editor]);

  /* Submit for review */
  async function submitForReview() {
    if (!doc) return;
    await triggerSave();
    setSaving(true);
    const res = await fetch("/api/content/documents", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      credentials: "include", body: JSON.stringify({ id: doc.id, action: "submit" }),
    });
    const data = await res.json();
    if (res.ok) setDoc(data);
    setSaving(false);
  }

  /* Counts */
  const wordCount = editor
    ? editor.getText().split(/\s+/).filter(Boolean).length
    : 0;
  const charCount = editor?.storage?.characterCount?.characters?.() ?? 0;

  if (loading) return <p style={{ color: "var(--text-muted)", padding: "40px 0" }}>Loading document…</p>;
  if (error)   return <div style={{ color: "var(--red)", padding: 20 }}>{error}</div>;
  if (!doc)    return <div style={{ color: "var(--text-muted)", padding: 20 }}>Document not found.</div>;

  const canSubmit = doc.status === "DRAFT" || doc.status === "REJECTED";

  return (
    <>
      {/* ── App header bar ── */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "10px 24px", borderBottom: "1px solid var(--border)",
        background: "var(--surface)", marginBottom: 0, gap: 16,
        position: "sticky", top: 0, zIndex: 20,
      }}>
        {/* Left: doc meta */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
          <a href="/content/workspace"
            style={{ color: "var(--text-muted)", fontSize: 12, textDecoration: "none", flexShrink: 0 }}>
            ← My Content
          </a>
          <span style={{ color: "var(--border)" }}>|</span>
          {canEdit ? (
            <input
              value={title}
              onChange={(e) => { setTitle(e.target.value); setSaveLabel("Unsaved changes…"); }}
              onBlur={() => triggerSave()}
              placeholder="Untitled document"
              style={{
                border: "none", background: "transparent", fontSize: 15, fontWeight: 600,
                color: "var(--text-primary)", outline: "none", minWidth: 180, width: "auto",
                maxWidth: 340,
              }}
            />
          ) : (
            <span style={{ fontSize: 15, fontWeight: 600, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 300 }}>
              {doc.title}
            </span>
          )}
          <span className={`badge ${STATUS_BADGE[doc.status] ?? "badge-gray"}`} style={{ fontSize: 11 }}>
            {STATUS_LABEL[doc.status] ?? doc.status}
          </span>
          <span style={{ fontSize: 11, color: "var(--text-muted)", flexShrink: 0 }}>
            {saving ? "Saving…" : saveLabel}
          </span>
        </div>

        {/* Right: actions */}
        <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
          {canEdit && (
            <button className="btn btn-secondary" style={{ fontSize: 13 }}
              onClick={() => triggerSave()} disabled={saving}>
              Save
            </button>
          )}
          {canSubmit && (
            <button className="btn btn-primary" style={{ fontSize: 13 }}
              onClick={submitForReview} disabled={saving}>
              Submit for Review
            </button>
          )}
          <a href={`/api/content/documents/export?id=${id}`} target="_blank" rel="noopener noreferrer"
            className="btn btn-ghost" style={{ fontSize: 13 }}>
            Export
          </a>
        </div>
      </div>

      {/* ── Rejection banner ── */}
      {doc.status === "REJECTED" && doc.adminComment && (
        <div style={{
          background: "#fef2f2", border: "none", borderBottom: "1px solid #fca5a5",
          borderLeft: "4px solid var(--red)", padding: "12px 24px",
        }}>
          <p style={{ fontWeight: 700, color: "var(--red)", margin: "0 0 2px", fontSize: 12, textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Rejected — Admin Feedback
          </p>
          <p style={{ color: "#991b1b", margin: 0, fontSize: 14 }}>{doc.adminComment}</p>
        </div>
      )}

      {/* ── Design/published info ── */}
      {(doc.status === "DESIGN_SENT" || doc.status === "PUBLISHED") && (
        <div style={{ background: "rgba(99,102,241,0.06)", borderBottom: "1px solid rgba(99,102,241,0.2)", padding: "12px 24px", display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: "#6366f1" }}>
            {doc.status === "DESIGN_SENT" ? "Sent to Design Team" : "Published"}
          </span>
          {doc.designedFileUrl && (
            <a href={doc.designedFileUrl} target="_blank" rel="noopener noreferrer"
              className="btn btn-ghost" style={{ fontSize: 12 }}>
              View Designed File ↗
            </a>
          )}
          {doc.adminComment && (
            <span style={{ fontSize: 13, color: "var(--text-muted)" }}>Note: {doc.adminComment}</span>
          )}
        </div>
      )}

      {/* ── Document canvas ── */}
      <div style={{
        background: "#f1f3f4",
        minHeight: "calc(100vh - 120px)",
        padding: "32px 24px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
      }}>
        {/* Topic/meta info bar */}
        <div style={{ width: "100%", maxWidth: 816, marginBottom: 8, display: "flex", gap: 8, alignItems: "center" }}>
          <span style={{ fontSize: 12, color: "#5f6368" }}>Topic: <strong>{doc.topic?.title}</strong></span>
          {doc.topic?.dueDate && (
            <span style={{ fontSize: 12, color: "#5f6368" }}>
              · Due: {new Date(doc.topic.dueDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
            </span>
          )}
          <span className="badge badge-blue" style={{ fontSize: 10 }}>
            {doc.topic?.productType} · Class {doc.topic?.classFrom}–{doc.topic?.classTo}
          </span>
        </div>

        {/* Paper */}
        <div style={{
          width: "100%", maxWidth: 816,
          background: "#fff",
          borderRadius: 2,
          boxShadow: "0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.1)",
          overflow: "hidden",
        }}>
          {/* Toolbar (sticky) */}
          <Toolbar editor={editor} readOnly={!canEdit} />

          {/* Editor content */}
          <div style={{ padding: "48px 72px 64px", minHeight: 700 }}>
            <style>{`
              .tiptap {
                outline: none;
                font-family: "Arial", "Helvetica Neue", sans-serif;
                font-size: 11pt;
                line-height: 1.75;
                color: #202124;
                caret-color: #1a73e8;
              }
              .tiptap h1 { font-size: 20pt; font-weight: 700; margin: 0 0 12px; color: #202124; }
              .tiptap h2 { font-size: 16pt; font-weight: 600; margin: 24px 0 8px; color: #202124; }
              .tiptap h3 { font-size: 13pt; font-weight: 600; margin: 20px 0 6px; color: #202124; }
              .tiptap p  { margin: 0 0 10px; }
              .tiptap p.is-empty::before {
                content: attr(data-placeholder);
                color: #9aa0a6;
                float: left;
                height: 0;
                pointer-events: none;
              }
              .tiptap ul, .tiptap ol { padding-left: 24px; margin: 0 0 10px; }
              .tiptap li { margin-bottom: 4px; }
              .tiptap blockquote {
                border-left: 3px solid #dadce0;
                margin: 12px 0;
                padding: 4px 0 4px 16px;
                color: #5f6368;
              }
              .tiptap code {
                background: #f1f3f4;
                border-radius: 3px;
                padding: 2px 5px;
                font-family: "Roboto Mono", monospace;
                font-size: 10pt;
                color: #c2185b;
              }
              .tiptap pre {
                background: #282c34;
                border-radius: 6px;
                padding: 16px 20px;
                overflow-x: auto;
                margin: 12px 0;
              }
              .tiptap pre code {
                background: none;
                color: #abb2bf;
                font-size: 10pt;
                padding: 0;
              }
              .tiptap a { color: #1a73e8; text-decoration: underline; }
              .tiptap hr { border: none; border-top: 1px solid #dadce0; margin: 20px 0; }
              .tiptap mark { border-radius: 2px; }
              .tiptap [data-text-align="center"] { text-align: center; }
              .tiptap [data-text-align="right"]  { text-align: right; }
              .tiptap [data-text-align="justify"]{ text-align: justify; }
            `}</style>
            <EditorContent editor={editor} />
          </div>
        </div>

        {/* ── Footer / word count ── */}
        <div style={{
          width: "100%", maxWidth: 816, marginTop: 12,
          display: "flex", justifyContent: "flex-end", gap: 16,
          fontSize: 12, color: "#5f6368",
        }}>
          <span>{wordCount.toLocaleString()} word{wordCount !== 1 ? "s" : ""}</span>
          <span>{charCount.toLocaleString()} character{charCount !== 1 ? "s" : ""}</span>
        </div>
      </div>
    </>
  );
}
