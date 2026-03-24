"use client";

import { useState } from "react";

export default function ExportsPage() {
  const [exporting, setExporting] = useState(false);
  const [msg, setMsg] = useState({ text: "", ok: false });

  const exportToSheets = async () => {
    setExporting(true); setMsg({ text: "", ok: false });
    try {
      const res = await fetch("/api/admin/export-sheets", {
        method: "POST",
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Export failed");
      setMsg({
        text: data.url
          ? `Exported successfully. ${data.rowsWritten ?? ""} rows written.`
          : "Exported successfully.",
        ok: true,
      });
    } catch (err: any) {
      setMsg({ text: err.message, ok: false });
    } finally {
      setExporting(false);
    }
  };

  return (
    <>
      <div className="page-header">
        <h1>Exports</h1>
        <p>Export data to Google Sheets or download as CSV</p>
      </div>

      {msg.text && (
        <div className={`alert ${msg.ok ? "alert-success" : "alert-error"}`} style={{ marginBottom: 20 }}>
          {msg.text}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>

        {/* Google Sheets Export */}
        <div className="card">
          <h2 style={{ marginBottom: 8 }}>Google Sheets</h2>
          <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 16 }}>
            Export all approved orders to the configured Google Sheets spreadsheet.
            Requires Google Service Account credentials in environment variables.
          </p>
          <div style={{ marginBottom: 12, fontSize: 13 }}>
            <div style={{ fontWeight: 500, marginBottom: 4 }}>What gets exported:</div>
            <ul style={{ color: "var(--text-muted)", paddingLeft: 18, lineHeight: 1.8 }}>
              <li>All APPROVED orders</li>
              <li>School name, city, rep name</li>
              <li>Gross &amp; net amounts</li>
              <li>Product type, order date</li>
              <li>Payment &amp; delivery status</li>
            </ul>
          </div>
          <button
            className="btn btn-primary"
            onClick={exportToSheets}
            disabled={exporting}
          >
            {exporting ? "Exporting…" : "Export to Google Sheets"}
          </button>
        </div>

        {/* Setup instructions */}
        <div className="card">
          <h2 style={{ marginBottom: 8 }}>Setup Guide</h2>
          <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 12 }}>
            To enable Google Sheets export, configure the following environment variables:
          </p>
          <div style={{ fontSize: 12, fontFamily: "var(--font-mono, monospace)",
            background: "rgba(0,0,0,0.04)", padding: 12, borderRadius: 8, lineHeight: 2 }}>
            <div>GOOGLE_SERVICE_ACCOUNT_EMAIL=</div>
            <div>GOOGLE_PRIVATE_KEY=</div>
            <div>GOOGLE_SHEETS_ID=</div>
          </div>
          <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 10 }}>
            1. Create a Google Cloud project and enable Sheets API<br />
            2. Create a Service Account and download the JSON key<br />
            3. Share the spreadsheet with the service account email<br />
            4. Run <code style={{ fontFamily: "inherit" }}>npm install googleapis</code>
          </p>
        </div>

      </div>
    </>
  );
}
