"use client";

import { useState } from "react";

export default function ExportSheetsButton() {
  const [loading, setLoading] = useState(false);
  const [result, setResult]   = useState<{ message: string; ok: boolean; url?: string } | null>(null);

  const handleExport = async () => {
    setLoading(true);
    setResult(null);
    try {
      const res  = await fetch("/api/admin/export-sheets", {
        method: "POST",
        credentials: "include",
      });
      const data = await res.json();

      if (data.success) {
        setResult({ ok: true, message: data.message, url: data.sheetUrl });
      } else {
        setResult({ ok: false, message: data.error || "Export failed." });
      }
    } catch {
      setResult({ ok: false, message: "Something went wrong." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <button
        className="btn btn-secondary"
        onClick={handleExport}
        disabled={loading}
        style={{ display: "inline-flex", alignItems: "center", gap: 7 }}
      >
        {/* Google Sheets icon */}
        <svg viewBox="0 0 24 24" width={15} height={15} fill="none">
          <rect x="3" y="3" width="18" height="18" rx="2" fill="#34a853" />
          <rect x="7" y="7" width="10" height="1.5" rx="0.75" fill="white" />
          <rect x="7" y="10.5" width="10" height="1.5" rx="0.75" fill="white" />
          <rect x="7" y="14" width="6" height="1.5" rx="0.75" fill="white" />
        </svg>
        {loading ? "Exporting..." : "Export to Google Sheets"}
      </button>

      {result && (
        <div
          className={`alert ${result.ok ? "alert-success" : "alert-error"}`}
          style={{ marginTop: 10, display: "inline-flex", alignItems: "center", gap: 10 }}
        >
          {result.message}
          {result.ok && result.url && (
            <a
              href={result.url}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "inherit", fontWeight: 600, textDecoration: "underline", whiteSpace: "nowrap" }}
            >
              Open Sheet →
            </a>
          )}
        </div>
      )}
    </div>
  );
}
