"use client";

import { useRef, useState } from "react";

const TEMPLATE_CSV = `schoolName,salesRepEmail,productType,grossAmount,netAmount,orderDate,deliveryDate,status
Springfield Elementary,alice@nutshell.com,ANNUAL,15000,13500,2026-03-01,2026-04-01,APPROVED
Shelbyville Middle,bob@nutshell.com,PAPERBACKS_PLAINS,8000,7200,2026-03-05,,PENDING`;

export default function ImportPage() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile]           = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult]       = useState<any>(null);
  const [error, setError]         = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) { setError("Please select a CSV file."); return; }

    setUploading(true);
    setError("");
    setResult(null);

    try {
      const fd = new FormData();
      fd.append("file", file);

      const res  = await fetch("/api/admin/import", { method: "POST", credentials: "include", body: fd });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Import failed");
      setResult(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const downloadTemplate = () => {
    const blob = new Blob([TEMPLATE_CSV], { type: "text/csv" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = "order_import_template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <div className="page-header">
        <h1>Bulk Order Import</h1>
        <p>Upload a CSV file to import multiple orders at once</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.4fr", gap: 16 }}>

        {/* ── Upload Form ── */}
        <div className="card">
          <h2 style={{ marginBottom: 16 }}>Upload CSV</h2>
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ border: "2px dashed var(--border)", borderRadius: "var(--radius-lg)", padding: "28px 20px", textAlign: "center", cursor: "pointer" }}
              onClick={() => fileRef.current?.click()}>
              <input ref={fileRef} type="file" accept=".csv" style={{ display: "none" }}
                onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
              <div style={{ fontSize: 28, marginBottom: 8 }}>📄</div>
              <p style={{ margin: 0, fontWeight: 500 }}>{file ? file.name : "Click to select CSV file"}</p>
              <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--text-muted)" }}>
                {file ? `${(file.size / 1024).toFixed(1)} KB` : "CSV files only"}
              </p>
            </div>

            {error && (
              <div style={{ padding: "10px 14px", borderRadius: "var(--radius)", background: "var(--red-soft, #fee2e2)", color: "var(--red, #dc2626)", fontSize: 13 }}>
                {error}
              </div>
            )}

            <button className="btn btn-primary" type="submit" disabled={uploading || !file}>
              {uploading ? "Importing…" : "Import Orders"}
            </button>
            <button className="btn btn-ghost" type="button" onClick={downloadTemplate}>
              Download Template CSV
            </button>
          </form>
        </div>

        {/* ── Column Guide ── */}
        <div className="card">
          <h2 style={{ marginBottom: 14 }}>CSV Format Guide</h2>
          <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 12 }}>
            The first row must be a header row. Required columns:
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {[
              { col: "schoolName",     req: true,  note: "Must match an existing school name exactly" },
              { col: "salesRepEmail",  req: true,  note: "Must match an existing user's email" },
              { col: "productType",    req: true,  note: "ANNUAL | PAPERBACKS_PLAINS | PAPERBACKS_HILLS | NUTSHELL_ANNUAL | NUTSHELL_PAPERBACKS" },
              { col: "grossAmount",    req: true,  note: "Number (e.g. 15000)" },
              { col: "netAmount",      req: true,  note: "Number after discounts" },
              { col: "orderDate",      req: false, note: "YYYY-MM-DD (optional)" },
              { col: "deliveryDate",   req: false, note: "YYYY-MM-DD (optional)" },
              { col: "status",         req: false, note: "PENDING | APPROVED | REJECTED (default: PENDING)" },
            ].map((row) => (
              <div key={row.col} style={{ background: "var(--bg)", borderRadius: "var(--radius)", border: "1px solid var(--border)", padding: "8px 12px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <code style={{ fontSize: 12, background: "var(--border)", padding: "1px 6px", borderRadius: 4 }}>{row.col}</code>
                  {row.req && <span className="badge badge-blue" style={{ fontSize: 10 }}>Required</span>}
                </div>
                <p style={{ margin: "4px 0 0", fontSize: 11, color: "var(--text-muted)" }}>{row.note}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Results ── */}
      {result && (
        <div className="card" style={{ marginTop: 16 }}>
          <h2 style={{ marginBottom: 14 }}>Import Results</h2>
          <div style={{ display: "flex", gap: 16, marginBottom: 16, flexWrap: "wrap" }}>
            {[
              { label: "Total Rows",   value: result.total,   color: "var(--text-primary)" },
              { label: "Created",      value: result.created, color: "var(--green)" },
              { label: "Errors",       value: result.errors,  color: result.errors > 0 ? "var(--red)" : "var(--text-muted)" },
            ].map((s) => (
              <div key={s.label} style={{ background: "var(--bg)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", padding: "12px 20px" }}>
                <div style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>{s.label}</div>
                <div style={{ fontSize: "1.6rem", fontWeight: 700, color: s.color }}>{s.value}</div>
              </div>
            ))}
          </div>

          {result.results.some((r: any) => r.status === "error") && (
            <>
              <h3 style={{ marginBottom: 10, color: "var(--red)" }}>Errors</h3>
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Row</th>
                      <th>Error</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.results.filter((r: any) => r.status === "error").map((r: any) => (
                      <tr key={r.row}>
                        <td style={{ fontFamily: "monospace" }}>Row {r.row}</td>
                        <td style={{ color: "var(--red)" }}>{r.error}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}
