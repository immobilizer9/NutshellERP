"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const PRODUCT_LABELS: Record<string, string> = {
  ANNUAL:            "Annual",
  PAPERBACKS_PLAINS: "Paperbacks (Plains)",
  PAPERBACKS_HILLS:  "Paperbacks (Hills)",
  ONLINE:            "Online",
};

export default function DesignDashboardPage() {
  const [docs,    setDocs]    = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploads, setUploads] = useState<Record<string, { url: string; name: string }>>({});
  const [saving,  setSaving]  = useState<Record<string, boolean>>({});
  const [msgs,    setMsgs]    = useState<Record<string, string>>({});

  useEffect(() => {
    fetch("/api/content/documents?status=DESIGN_SENT", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setDocs(Array.isArray(d) ? d : []))
      .finally(() => setLoading(false));
  }, []);

  function setUpload(id: string, field: "url" | "name", value: string) {
    setUploads((prev) => ({
      ...prev,
      [id]: { url: prev[id]?.url ?? "", name: prev[id]?.name ?? "", [field]: value },
    }));
  }

  async function submitUpload(id: string) {
    const u = uploads[id];
    if (!u?.url) return;
    setSaving((prev) => ({ ...prev, [id]: true }));
    try {
      const res = await fetch("/api/content/documents", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          id,
          action: "upload_design",
          designedFileUrl:  u.url,
          designedFileName: u.name || null,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setDocs((prev) => prev.map((d) => (d.id === id ? data : d)));
        setMsgs((prev) => ({ ...prev, [id]: "Upload saved!" }));
        setUploads((prev) => { const n = { ...prev }; delete n[id]; return n; });
      } else {
        setMsgs((prev) => ({ ...prev, [id]: data.error ?? "Failed to save" }));
      }
    } finally {
      setSaving((prev) => ({ ...prev, [id]: false }));
    }
  }

  if (loading) return <p style={{ color: "var(--text-muted)" }}>Loading...</p>;

  return (
    <>
      <div className="page-header">
        <h1>My Design Tasks</h1>
        <p>Documents waiting for your design work.</p>
      </div>

      {docs.length === 0 ? (
        <div className="empty-state">
          <p>No design tasks assigned</p>
          <p>Documents sent for design will appear here.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {docs.map((d) => (
            <div key={d.id} className="card">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                <div>
                  <h3 style={{ margin: "0 0 6px", fontSize: 16 }}>{d.title}</h3>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <span className="badge badge-indigo">DESIGN SENT</span>
                    <span className="badge badge-blue">{PRODUCT_LABELS[d.topic?.productType] ?? d.topic?.productType}</span>
                    <span className="badge badge-gray">Class {d.topic?.classFrom}–{d.topic?.classTo}</span>
                  </div>
                  <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "8px 0 0" }}>
                    Topic: {d.topic?.title}
                  </p>
                  {d.sentToDesignAt && (
                    <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "2px 0 0" }}>
                      Sent: {new Date(d.sentToDesignAt).toLocaleDateString("en-IN")}
                    </p>
                  )}
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <a
                    href={`/api/content/documents/export?id=${d.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-secondary"
                    style={{ fontSize: 12, padding: "4px 10px" }}
                  >
                    Download Content
                  </a>
                  <Link href={`/content/documents/${d.id}`} className="btn btn-ghost" style={{ fontSize: 12, padding: "4px 10px" }}>
                    View Doc
                  </Link>
                </div>
              </div>

              {/* Admin instructions */}
              {d.adminComment && (
                <div style={{ background: "#fef9c3", border: "1px solid #fde047", borderRadius: "var(--radius)", padding: "10px 14px", marginBottom: 14 }}>
                  <p style={{ fontWeight: 600, color: "#854d0e", fontSize: 12, margin: "0 0 4px", textTransform: "uppercase", letterSpacing: "0.04em" }}>Design Instructions</p>
                  <p style={{ color: "#78350f", fontSize: 13, margin: 0, lineHeight: 1.6 }}>{d.adminComment}</p>
                </div>
              )}

              {/* Existing upload */}
              {d.designedFileUrl && (
                <div style={{ background: "var(--bg)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "10px 14px", marginBottom: 12 }}>
                  <p style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", margin: "0 0 4px", textTransform: "uppercase" }}>Current Upload</p>
                  <a href={d.designedFileUrl} target="_blank" rel="noopener noreferrer" style={{ color: "var(--accent)", fontSize: 13 }}>
                    {d.designedFileName ?? d.designedFileUrl}
                  </a>
                </div>
              )}

              {/* Upload form */}
              <div style={{ display: "flex", gap: 8, alignItems: "flex-start", flexWrap: "wrap" }}>
                <div style={{ flex: 1, minWidth: 200 }}>
                  <label className="form-label" style={{ fontSize: 12 }}>Designed File URL (Google Drive / link) *</label>
                  <input
                    className="input"
                    type="url"
                    placeholder="https://drive.google.com/..."
                    value={uploads[d.id]?.url ?? ""}
                    onChange={(e) => setUpload(d.id, "url", e.target.value)}
                  />
                </div>
                <div style={{ flex: 1, minWidth: 160 }}>
                  <label className="form-label" style={{ fontSize: 12 }}>File Name (optional)</label>
                  <input
                    className="input"
                    placeholder="e.g. Class5_GK_Ch3_Design.pdf"
                    value={uploads[d.id]?.name ?? ""}
                    onChange={(e) => setUpload(d.id, "name", e.target.value)}
                  />
                </div>
                <div style={{ paddingTop: 22 }}>
                  <button
                    className="btn btn-primary"
                    onClick={() => submitUpload(d.id)}
                    disabled={saving[d.id] || !uploads[d.id]?.url}
                  >
                    {saving[d.id] ? "Saving..." : "Upload Link"}
                  </button>
                </div>
              </div>
              {msgs[d.id] && (
                <p style={{ fontSize: 13, color: msgs[d.id].includes("saved") ? "var(--green)" : "var(--red)", marginTop: 8 }}>
                  {msgs[d.id]}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </>
  );
}
