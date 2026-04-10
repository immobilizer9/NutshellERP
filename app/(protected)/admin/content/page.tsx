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

type Tab        = "topics" | "documents" | "design";
type ImportStep = "idle" | "input" | "preview" | "importing" | "done";

function downloadSampleCSV() {
  const csv = [
    "Title,Assignee,Product Type,Class From,Class To,Description,Due Date",
    "Chapter 1 - Our Solar System,content@nutshell.com,Annual,3,5,Introduction to planets and space,31/12/2025",
    "Quiz Bank - Indian History,trainer@nutshell.com,Paperbacks Plains,6,8,MCQ bank for Indian history topics,15/01/2026",
  ].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = "topics_import_template.csv";
  a.click();
  URL.revokeObjectURL(url);
}

export default function AdminContentPage() {
  const [tab,     setTab]     = useState<Tab>("topics");
  const [topics,  setTopics]  = useState<any[]>([]);
  const [docs,    setDocs]    = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [topicStatus,  setTopicStatus]  = useState("");
  const [topicProduct, setTopicProduct] = useState("");
  const [docStatus,    setDocStatus]    = useState("");

  // Inline reject
  const [rejectId,      setRejectId]      = useState<string | null>(null);
  const [rejectComment, setRejectComment] = useState("");
  const [acting,        setActing]        = useState(false);

  // Inline delete confirmation
  const [deleteTopicId, setDeleteTopicId] = useState<string | null>(null);
  const [deleteDocId,   setDeleteDocId]   = useState<string | null>(null);

  // ── Import modal state ──────────────────────────────────────────────────────
  const [importStep,    setImportStep]    = useState<ImportStep>("idle");
  const [sheetUrl,      setSheetUrl]      = useState("");
  const [sheetName,     setSheetName]     = useState("");
  const [importing,     setImporting]     = useState(false);
  const [importError,   setImportError]   = useState("");
  const [previewRows,   setPreviewRows]   = useState<any[]>([]);
  const [validCount,    setValidCount]    = useState(0);
  const [errorCount,    setErrorCount]    = useState(0);
  const [importResult,  setImportResult]  = useState<{ created: number; failed: number; errors: string[] } | null>(null);
  const [serviceEmail,  setServiceEmail]  = useState("");
  const [showHowTo,     setShowHowTo]     = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/content/topics?limit=200",    { credentials: "include" }).then((r) => r.json()),
      fetch("/api/content/documents?limit=200", { credentials: "include" }).then((r) => r.json()),
    ]).then(([t, d]) => {
      setTopics(Array.isArray(t) ? t : (Array.isArray(t?.topics) ? t.topics : []));
      setDocs(Array.isArray(d) ? d : (Array.isArray(d?.docs) ? d.docs : []));
    }).finally(() => setLoading(false));
  }, []);

  async function action(id: string, act: string, extra?: Record<string, any>) {
    setActing(true);
    try {
      const res  = await fetch("/api/content/documents", {
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

  async function deleteTopic(id: string) {
    setActing(true);
    try {
      const res = await fetch(`/api/content/topics?id=${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (res.ok) {
        setTopics((prev) => prev.filter((t) => t.id !== id));
        setDocs((prev) => prev.filter((d) => d.topicId !== id));
      }
    } finally {
      setActing(false);
      setDeleteTopicId(null);
    }
  }

  async function deleteDoc(id: string) {
    setActing(true);
    try {
      const res = await fetch(`/api/content/documents?id=${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (res.ok) {
        setDocs((prev) => prev.filter((d) => d.id !== id));
      }
    } finally {
      setActing(false);
      setDeleteDocId(null);
    }
  }

  // ── Import handlers ─────────────────────────────────────────────────────────

  async function openImportModal() {
    setImportStep("input");
    setSheetUrl("");
    setSheetName("");
    setImportError("");
    setPreviewRows([]);
    setImportResult(null);
    setShowHowTo(false);
    // Fetch service account email if not already fetched
    if (!serviceEmail) {
      try {
        const res = await fetch("/api/content/topics/import", { credentials: "include" });
        const data = await res.json();
        setServiceEmail(data.serviceAccountEmail ?? "");
      } catch { /* ignore */ }
    }
  }

  function closeImportModal() {
    setImportStep("idle");
    if (importResult && importResult.created > 0) {
      // Refresh topics list after successful import
      fetch("/api/content/topics?limit=200", { credentials: "include" })
        .then((r) => r.json())
        .then((t) => setTopics(Array.isArray(t) ? t : (Array.isArray(t?.topics) ? t.topics : [])));
    }
  }

  async function runPreview() {
    if (!sheetUrl.trim()) {
      setImportError("Please enter a Google Sheet URL or ID.");
      return;
    }
    setImporting(true);
    setImportError("");
    try {
      const res  = await fetch("/api/content/topics/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ sheetId: sheetUrl.trim(), sheetName: sheetName.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        setImportError(data.error ?? "Failed to read sheet.");
        return;
      }
      setPreviewRows(data.rows ?? []);
      setValidCount(data.validCount ?? 0);
      setErrorCount(data.errorCount ?? 0);
      setImportStep("preview");
    } finally {
      setImporting(false);
    }
  }

  async function runConfirm() {
    setImportStep("importing");
    try {
      const res  = await fetch("/api/content/topics/import/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ rows: previewRows }),
      });
      const data = await res.json();
      setImportResult(data);
      setImportStep("done");
    } catch {
      setImportResult({ created: 0, failed: 0, errors: ["Network error — please try again."] });
      setImportStep("done");
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  if (loading) return <div style={{ color: "var(--text-muted)", padding: "40px 0", textAlign: "center" }}>Loading...</div>;

  const filteredTopics = topics.filter((t) => {
    if (topicStatus  && t.status      !== topicStatus)  return false;
    if (topicProduct && t.productType !== topicProduct) return false;
    return true;
  });

  const filteredDocs  = docs.filter((d) => !docStatus || d.status === docStatus);
  const designQueue   = docs.filter((d) => d.status === "DESIGN_SENT");

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Content Management</h1>
          <p>Manage topics, review documents, and track design queue.</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn btn-secondary" onClick={openImportModal}>
            ↑ Import from Sheets
          </button>
          <Link href="/admin/content/topics/new" className="btn btn-primary">+ New Topic</Link>
        </div>
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
                    <th></th>
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
                      <td>
                        {deleteTopicId === t.id ? (
                          <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                            <span style={{ fontSize: 11, color: "var(--red)", whiteSpace: "nowrap" }}>Delete topic + all docs?</span>
                            <button className="btn btn-danger" style={{ fontSize: 11, padding: "2px 8px" }} onClick={() => deleteTopic(t.id)} disabled={acting}>Yes</button>
                            <button className="btn btn-ghost"  style={{ fontSize: 11, padding: "2px 8px" }} onClick={() => setDeleteTopicId(null)}>No</button>
                          </div>
                        ) : (
                          <button className="btn btn-ghost" style={{ fontSize: 11, padding: "2px 8px", color: "var(--red)" }} onClick={() => setDeleteTopicId(t.id)}>Delete</button>
                        )}
                      </td>
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
                        <Link href={`/content/workspace/${d.id}`} style={{ fontWeight: 600, color: "var(--accent)" }}>{d.title}</Link>
                        <span className={`badge ${STATUS_BADGE[d.status] ?? "badge-gray"}`}>{d.status}</span>
                      </div>
                      <p style={{ fontSize: 12, color: "var(--text-muted)", margin: 0 }}>
                        Topic: {d.topic?.title} · Author: {d.author?.name} · {new Date(d.updatedAt).toLocaleDateString("en-IN")}
                      </p>
                    </div>
                    <div style={{ display: "flex", gap: 6, flexShrink: 0, flexWrap: "wrap", justifyContent: "flex-end" }}>
                      {d.status === "SUBMITTED" && (
                        <>
                          <button className="btn btn-success"   style={{ fontSize: 12, padding: "4px 10px" }} onClick={() => action(d.id, "approve")} disabled={acting}>Approve</button>
                          <button className="btn btn-danger"    style={{ fontSize: 12, padding: "4px 10px" }} onClick={() => setRejectId(d.id)} disabled={acting}>Reject</button>
                          <button className="btn btn-secondary" style={{ fontSize: 12, padding: "4px 10px" }} onClick={() => action(d.id, "send_to_design")} disabled={acting}>Send to Design</button>
                        </>
                      )}
                      {d.status === "APPROVED" && (
                        <>
                          <button className="btn btn-secondary" style={{ fontSize: 12, padding: "4px 10px" }} onClick={() => action(d.id, "send_to_design")} disabled={acting}>Send to Design</button>
                          <button className="btn btn-primary"   style={{ fontSize: 12, padding: "4px 10px" }} onClick={() => action(d.id, "publish")} disabled={acting}>Publish</button>
                        </>
                      )}
                      {d.status === "DESIGN_SENT" && (
                        <button className="btn btn-primary" style={{ fontSize: 12, padding: "4px 10px" }} onClick={() => action(d.id, "publish")} disabled={acting}>Publish</button>
                      )}
                      {deleteDocId === d.id ? (
                        <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                          <span style={{ fontSize: 11, color: "var(--red)" }}>Delete?</span>
                          <button className="btn btn-danger" style={{ fontSize: 11, padding: "2px 8px" }} onClick={() => deleteDoc(d.id)} disabled={acting}>Yes</button>
                          <button className="btn btn-ghost"  style={{ fontSize: 11, padding: "2px 8px" }} onClick={() => setDeleteDocId(null)}>No</button>
                        </div>
                      ) : (
                        <button className="btn btn-ghost" style={{ fontSize: 11, padding: "2px 8px", color: "var(--red)" }} onClick={() => { setRejectId(null); setDeleteDocId(d.id); }}>Delete</button>
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
                        <Link href={`/content/workspace/${d.id}`} style={{ fontWeight: 600, color: "var(--accent)" }}>{d.title}</Link>
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

      {/* ── Import Modal ───────────────────────────────────────────────────────── */}
      {importStep !== "idle" && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 50,
          display: "flex", alignItems: "flex-start", justifyContent: "center",
          padding: 20, overflowY: "auto",
        }}>
          <div className="card" style={{ width: "100%", maxWidth: 680, marginTop: 20, marginBottom: 20 }}>

            {/* ── STEP 1: Input ── */}
            {importStep === "input" && (
              <>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
                  <div>
                    <h2 style={{ margin: 0 }}>Import Topics from Google Sheets</h2>
                    <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--text-muted)" }}>
                      Bulk-create topics and documents from a spreadsheet
                    </p>
                  </div>
                  <button className="btn btn-ghost" onClick={closeImportModal} style={{ fontSize: 18, padding: "2px 8px", lineHeight: 1 }}>×</button>
                </div>

                {/* Service account sharing notice */}
                <div style={{
                  background: "color-mix(in srgb, var(--accent) 8%, transparent)",
                  border: "1px solid color-mix(in srgb, var(--accent) 25%, transparent)",
                  borderRadius: "var(--radius)", padding: "10px 14px", marginBottom: 16, fontSize: 13,
                }}>
                  <strong style={{ color: "var(--accent)" }}>Before importing:</strong> share your Google Sheet with{" "}
                  <code style={{ background: "var(--bg)", padding: "1px 5px", borderRadius: 3, fontSize: 12 }}>
                    {serviceEmail || "the service account email"}
                  </code>{" "}
                  as a Viewer.
                </div>

                {/* Required columns */}
                <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 12 }}>
                  Your sheet must have these column headers (case-insensitive):{" "}
                  <strong>Title</strong>, <strong>Assignee</strong> (email), <strong>Product Type</strong>,{" "}
                  <strong>Class From</strong>, <strong>Class To</strong>.
                  Optional: <em>Description</em>, <em>Due Date</em>.
                </p>

                <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 16 }}>
                  <div>
                    <label className="form-label">Google Sheet URL or ID *</label>
                    <input
                      className="input"
                      placeholder="https://docs.google.com/spreadsheets/d/... or just the ID"
                      value={sheetUrl}
                      onChange={(e) => setSheetUrl(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && runPreview()}
                    />
                    <p style={{ fontSize: 11.5, color: "var(--text-muted)", margin: "4px 0 0" }}>
                      The Sheet ID is the long string between <code>/d/</code> and <code>/edit</code> in the URL.
                    </p>
                  </div>
                  <div>
                    <label className="form-label">Sheet Name <span style={{ fontWeight: 400, color: "var(--text-muted)" }}>(optional, default: Sheet1)</span></label>
                    <input
                      className="input"
                      placeholder="Sheet1"
                      value={sheetName}
                      onChange={(e) => setSheetName(e.target.value)}
                      style={{ maxWidth: 220 }}
                    />
                  </div>
                </div>

                {importError && (
                  <div className="alert alert-error" style={{ marginBottom: 14 }}>{importError}</div>
                )}

                {/* How to share (expandable) */}
                <div style={{ marginBottom: 16 }}>
                  <button
                    className="btn btn-ghost"
                    style={{ fontSize: 13, padding: "4px 0", color: "var(--accent)" }}
                    onClick={() => setShowHowTo((v) => !v)}
                  >
                    {showHowTo ? "▼" : "▶"} How to share the sheet
                  </button>
                  {showHowTo && (
                    <ol style={{ fontSize: 13, color: "var(--text-secondary)", margin: "8px 0 0 0", paddingLeft: 20, lineHeight: 1.8 }}>
                      <li>Open your Google Sheet</li>
                      <li>Click <strong>Share</strong> (top right)</li>
                      <li>
                        Add{" "}
                        <code style={{ background: "var(--bg)", padding: "1px 5px", borderRadius: 3, fontSize: 11.5 }}>
                          {serviceEmail || "the service account email"}
                        </code>{" "}
                        as a <strong>Viewer</strong>
                      </li>
                      <li>Copy the Sheet URL or ID and paste it above</li>
                    </ol>
                  )}
                </div>

                <div style={{ display: "flex", gap: 8, justifyContent: "space-between", alignItems: "center" }}>
                  <button className="btn btn-ghost" style={{ fontSize: 12 }} onClick={downloadSampleCSV}>
                    ↓ Download Sample CSV
                  </button>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button className="btn btn-ghost" onClick={closeImportModal}>Cancel</button>
                    <button className="btn btn-primary" onClick={runPreview} disabled={importing}>
                      {importing ? "Reading sheet…" : "Preview →"}
                    </button>
                  </div>
                </div>
              </>
            )}

            {/* ── STEP 2: Preview ── */}
            {importStep === "preview" && (
              <>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
                  <h2 style={{ margin: 0 }}>Preview Import</h2>
                  <button className="btn btn-ghost" onClick={closeImportModal} style={{ fontSize: 18, padding: "2px 8px", lineHeight: 1 }}>×</button>
                </div>

                {/* Summary */}
                <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
                  <div style={{
                    flex: 1, minWidth: 140, padding: "10px 14px", borderRadius: "var(--radius)",
                    background: "color-mix(in srgb, var(--green) 10%, transparent)",
                    border: "1px solid color-mix(in srgb, var(--green) 30%, transparent)",
                  }}>
                    <div style={{ fontSize: 22, fontWeight: 800, color: "var(--green)" }}>{validCount}</div>
                    <div style={{ fontSize: 12, color: "var(--text-muted)" }}>rows ready to import</div>
                  </div>
                  {errorCount > 0 && (
                    <div style={{
                      flex: 1, minWidth: 140, padding: "10px 14px", borderRadius: "var(--radius)",
                      background: "color-mix(in srgb, var(--red) 8%, transparent)",
                      border: "1px solid color-mix(in srgb, var(--red) 25%, transparent)",
                    }}>
                      <div style={{ fontSize: 22, fontWeight: 800, color: "var(--red)" }}>{errorCount}</div>
                      <div style={{ fontSize: 12, color: "var(--text-muted)" }}>rows with errors (will be skipped)</div>
                    </div>
                  )}
                </div>

                {errorCount > 0 && (
                  <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 12 }}>
                    Rows with errors will be skipped. Only valid rows will be imported.
                  </p>
                )}

                {/* Preview table */}
                <div className="table-wrap" style={{ maxHeight: 360, overflowY: "auto", marginBottom: 16 }}>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Title</th>
                        <th>Assignee</th>
                        <th>Product</th>
                        <th>Classes</th>
                        <th>Due Date</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {previewRows.map((row) => (
                        <tr key={row.rowNum} style={{ opacity: row.error ? 0.7 : 1 }}>
                          <td style={{ color: "var(--text-muted)", fontSize: 12 }}>{row.rowNum}</td>
                          <td style={{ fontWeight: 500, maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {row.title || <em style={{ color: "var(--text-muted)" }}>(empty)</em>}
                          </td>
                          <td style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                            {row.valid ? (
                              <>
                                <span style={{ fontWeight: 500 }}>{row.assigneeName}</span>
                                <span style={{ display: "block", color: "var(--text-muted)", fontSize: 11 }}>{row.assigneeEmail}</span>
                              </>
                            ) : (
                              <span style={{ color: "var(--text-muted)", fontSize: 12 }}>{row.assigneeEmail}</span>
                            )}
                          </td>
                          <td style={{ fontSize: 12 }}>
                            {row.productType ? (
                              <span className="badge badge-blue" style={{ fontSize: 10.5 }}>
                                {PRODUCT_LABELS[row.productType] ?? row.productType}
                              </span>
                            ) : (
                              <span style={{ color: "var(--text-muted)", fontSize: 12 }}>{row.productRaw || "—"}</span>
                            )}
                          </td>
                          <td style={{ fontSize: 12, color: "var(--text-muted)" }}>
                            {row.classFrom && row.classTo ? `${row.classFrom}–${row.classTo}` : `${row.classFromRaw || "?"}–${row.classToRaw || "?"}`}
                          </td>
                          <td style={{ fontSize: 12, color: "var(--text-muted)" }}>
                            {row.dueDate ? new Date(row.dueDate).toLocaleDateString("en-IN") : "—"}
                          </td>
                          <td>
                            {row.valid ? (
                              <span style={{ fontSize: 11.5, fontWeight: 600, color: "var(--green)" }}>✓ Ready</span>
                            ) : (
                              <span style={{ fontSize: 11, color: "var(--red)", maxWidth: 160, display: "block" }}>
                                ✗ {row.error}
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                  <button className="btn btn-ghost" onClick={() => setImportStep("input")}>← Back</button>
                  <button className="btn btn-ghost" onClick={closeImportModal}>Cancel</button>
                  <button
                    className="btn btn-primary"
                    onClick={runConfirm}
                    disabled={validCount === 0}
                  >
                    Import {validCount} Topic{validCount !== 1 ? "s" : ""}
                  </button>
                </div>
              </>
            )}

            {/* ── STEP 3: Importing spinner ── */}
            {importStep === "importing" && (
              <div style={{ textAlign: "center", padding: "40px 24px" }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>⏳</div>
                <p style={{ fontWeight: 600, fontSize: 15, margin: "0 0 6px" }}>Creating topics and documents…</p>
                <p style={{ fontSize: 13, color: "var(--text-muted)", margin: 0 }}>Please wait, this may take a moment.</p>
              </div>
            )}

            {/* ── STEP 4: Done ── */}
            {importStep === "done" && importResult && (
              <>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
                  <h2 style={{ margin: 0 }}>Import Complete</h2>
                </div>

                <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
                  <div style={{
                    flex: 1, minWidth: 140, padding: "14px 16px", borderRadius: "var(--radius)",
                    background: "color-mix(in srgb, var(--green) 10%, transparent)",
                    border: "1px solid color-mix(in srgb, var(--green) 30%, transparent)",
                    textAlign: "center",
                  }}>
                    <div style={{ fontSize: 28, fontWeight: 800, color: "var(--green)" }}>{importResult.created}</div>
                    <div style={{ fontSize: 13, color: "var(--text-muted)" }}>topics created</div>
                  </div>
                  {importResult.failed > 0 && (
                    <div style={{
                      flex: 1, minWidth: 140, padding: "14px 16px", borderRadius: "var(--radius)",
                      background: "color-mix(in srgb, var(--red) 8%, transparent)",
                      border: "1px solid color-mix(in srgb, var(--red) 25%, transparent)",
                      textAlign: "center",
                    }}>
                      <div style={{ fontSize: 28, fontWeight: 800, color: "var(--red)" }}>{importResult.failed}</div>
                      <div style={{ fontSize: 13, color: "var(--text-muted)" }}>failed</div>
                    </div>
                  )}
                </div>

                {importResult.created > 0 && (
                  <div className="alert alert-success" style={{ marginBottom: 14 }}>
                    Successfully created {importResult.created} topic{importResult.created !== 1 ? "s" : ""} and document{importResult.created !== 1 ? "s" : ""}.
                    Content team members can now see their topics in My Topics.
                  </div>
                )}

                {importResult.errors.length > 0 && (
                  <div style={{ marginBottom: 16 }}>
                    <p style={{ fontSize: 13, fontWeight: 600, color: "var(--red)", marginBottom: 6 }}>Errors:</p>
                    <ul style={{ fontSize: 12, color: "var(--text-secondary)", margin: 0, paddingLeft: 18, lineHeight: 1.8 }}>
                      {importResult.errors.map((e, i) => <li key={i}>{e}</li>)}
                    </ul>
                  </div>
                )}

                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                  <button className="btn btn-primary" onClick={closeImportModal}>Close</button>
                </div>
              </>
            )}

          </div>
        </div>
      )}
    </>
  );
}
