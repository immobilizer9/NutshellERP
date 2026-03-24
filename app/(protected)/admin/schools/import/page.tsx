"use client";

import { useRef, useState } from "react";

const COLUMNS = [
  { key: "name",          label: "School Name",    required: true,  note: "Full name of the school" },
  { key: "address",       label: "Address",        required: true,  note: "Street address" },
  { key: "city",          label: "City",           required: true,  note: "e.g. Kolkata, Siliguri" },
  { key: "state",         label: "State",          required: true,  note: "e.g. West Bengal" },
  { key: "contactPerson", label: "Contact Person", required: false, note: "Principal or admin name" },
  { key: "contactPhone",  label: "Contact Phone",  required: false, note: "10-digit mobile number" },
  { key: "pipelineStage", label: "Pipeline Stage", required: false, note: "LEAD / CONTACTED / VISITED / PROPOSAL_SENT / NEGOTIATION / CLOSED_WON / CLOSED_LOST (defaults to LEAD)" },
  { key: "latitude",      label: "Latitude",       required: false, note: "Decimal degrees, e.g. 22.5726" },
  { key: "longitude",     label: "Longitude",      required: false, note: "Decimal degrees, e.g. 88.3639" },
];

const EXAMPLE_ROWS = [
  ["St. Xavier's School", "12 Park Street", "Kolkata", "West Bengal", "Fr. John", "9800000001", "LEAD", "22.5726", "88.3639"],
  ["Springdale Academy", "45 Hill Road", "Siliguri", "West Bengal", "Mrs. Sharma", "9800000002", "VISITED", "26.7271", "88.3953"],
];

function downloadTemplate() {
  const header = COLUMNS.map((c) => c.key).join(",");
  const rows   = EXAMPLE_ROWS.map((r) => r.map((v) => `"${v}"`).join(","));
  const csv    = [header, ...rows].join("\n");
  const blob   = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url    = URL.createObjectURL(blob);
  const a      = document.createElement("a");
  a.href       = url;
  a.download   = "schools_import_template.csv";
  a.click();
  URL.revokeObjectURL(url);
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') { inQuotes = !inQuotes; }
    else if (ch === "," && !inQuotes) { result.push(current.trim()); current = ""; }
    else { current += ch; }
  }
  result.push(current.trim());
  return result;
}

function parseCSV(text: string) {
  const lines = text.trim().split("\n").map((l) => l.replace(/\r/, "").trim()).filter(Boolean);
  if (lines.length < 2) return { headers: [], rows: [], error: "File must have a header row and at least one data row." };

  const headers = lines[0].replace(/^\uFEFF/, "").split(",").map((h) => h.trim().replace(/"/g, ""));
  const rows    = lines.slice(1).map((line) => {
    const cols: Record<string, string> = {};
    const vals = parseCSVLine(line);
    headers.forEach((h, i) => { cols[h] = vals[i] ?? ""; });
    return cols;
  });
  return { headers, rows, error: null };
}

export default function SchoolImportPage() {
  const fileRef     = useRef<HTMLInputElement>(null);
  const [preview,   setPreview]   = useState<{ headers: string[]; rows: Record<string, string>[] } | null>(null);
  const [parseError, setParseError] = useState("");
  const [csvText,   setCsvText]   = useState("");
  const [importing, setImporting] = useState(false);
  const [result,    setResult]    = useState<{ created: number; skipped: number; errors: string[] } | null>(null);
  const [fileName,  setFileName]  = useState("");

  const handleFile = (file: File) => {
    setFileName(file.name);
    setResult(null);
    setParseError("");
    setPreview(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      setCsvText(text);
      const { headers, rows, error } = parseCSV(text);
      if (error) { setParseError(error); return; }
      setPreview({ headers, rows });
    };
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const runImport = async () => {
    if (!csvText) return;
    setImporting(true);
    setResult(null);
    try {
      const res = await fetch("/api/admin/schools/bulk-upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ csv: csvText }),
      });
      const data = await res.json();
      if (!res.ok) { setParseError(data.error || "Import failed."); }
      else { setResult(data); setPreview(null); setCsvText(""); setFileName(""); }
    } catch {
      setParseError("Network error. Please try again.");
    } finally {
      setImporting(false);
    }
  };

  const reset = () => {
    setPreview(null); setParseError(""); setCsvText(""); setFileName(""); setResult(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  return (
    <>
      <div className="page-header">
        <h1>Import Schools</h1>
        <p>Bulk-import schools from a CSV file.</p>
      </div>

      {/* Step 1 — Download template */}
      <div className="card" style={{ marginBottom: 20 }}>
        <h2 style={{ marginBottom: 8 }}>Step 1 — Download Template</h2>
        <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 16 }}>
          Download the CSV template, fill it in (Excel or Google Sheets), and save as CSV before uploading.
        </p>

        <button className="btn btn-primary" onClick={downloadTemplate} style={{ marginBottom: 20 }}>
          ↓ Download Template (.csv)
        </button>

        {/* Column reference */}
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Column</th>
                <th>Required</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              {COLUMNS.map((col) => (
                <tr key={col.key}>
                  <td style={{ fontFamily: "monospace", fontSize: 12.5 }}>{col.key}</td>
                  <td>
                    {col.required
                      ? <span className="badge badge-red" style={{ fontSize: 11 }}>Required</span>
                      : <span className="badge badge-gray" style={{ fontSize: 11 }}>Optional</span>}
                  </td>
                  <td style={{ fontSize: 13, color: "var(--text-muted)" }}>{col.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Step 2 — Upload */}
      <div className="card" style={{ marginBottom: 20 }}>
        <h2 style={{ marginBottom: 12 }}>Step 2 — Upload CSV</h2>

        {!preview && !result && (
          <div
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            onClick={() => fileRef.current?.click()}
            style={{
              border: "2px dashed var(--border)",
              borderRadius: "var(--radius)",
              padding: "40px 20px",
              textAlign: "center",
              cursor: "pointer",
              color: "var(--text-muted)",
              transition: "border-color 0.15s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--accent)")}
            onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
          >
            <div style={{ fontSize: 28, marginBottom: 8 }}>📄</div>
            <div style={{ fontWeight: 500, marginBottom: 4 }}>Drag & drop your CSV here</div>
            <div style={{ fontSize: 13 }}>or click to browse</div>
            <input
              ref={fileRef}
              type="file"
              accept=".csv,text/csv"
              style={{ display: "none" }}
              onChange={handleFileChange}
            />
          </div>
        )}

        {parseError && (
          <div className="alert alert-error" style={{ marginTop: 12 }}>{parseError}</div>
        )}
      </div>

      {/* Step 3 — Preview & confirm */}
      {preview && (
        <div className="card" style={{ marginBottom: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div>
              <h2 style={{ margin: 0 }}>Step 3 — Review & Import</h2>
              <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "4px 0 0" }}>
                {fileName} · {preview.rows.length} row{preview.rows.length !== 1 ? "s" : ""} detected
              </p>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn" onClick={reset}>Cancel</button>
              <button className="btn btn-primary" onClick={runImport} disabled={importing}>
                {importing ? "Importing…" : `Import ${preview.rows.length} Schools`}
              </button>
            </div>
          </div>

          <div className="table-wrap" style={{ maxHeight: 360, overflowY: "auto" }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>#</th>
                  {preview.headers.map((h) => <th key={h}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {preview.rows.map((row, i) => (
                  <tr key={i}>
                    <td style={{ color: "var(--text-muted)", fontSize: 12 }}>{i + 1}</td>
                    {preview.headers.map((h) => (
                      <td key={h} style={{ fontSize: 13 }}>{row[h] || <span style={{ color: "var(--text-muted)" }}>—</span>}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Result */}
      {result && (
        <div className="card">
          <h2 style={{ marginBottom: 16 }}>Import Complete</h2>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 20 }}>
            <div className="stat-card">
              <div className="stat-label">Created</div>
              <div className="stat-value" style={{ color: "var(--green)" }}>{result.created}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Skipped</div>
              <div className="stat-value" style={{ color: result.skipped > 0 ? "var(--yellow)" : undefined }}>
                {result.skipped}
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Errors</div>
              <div className="stat-value" style={{ color: result.errors.length > 0 ? "var(--red)" : undefined }}>
                {result.errors.length}
              </div>
            </div>
          </div>

          {result.errors.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontWeight: 500, fontSize: 13, marginBottom: 8 }}>Row errors:</div>
              <div style={{
                background: "rgba(220,38,38,0.04)",
                border: "1px solid rgba(220,38,38,0.15)",
                borderRadius: "var(--radius)",
                padding: 12,
                fontSize: 12.5,
                fontFamily: "monospace",
                display: "flex",
                flexDirection: "column",
                gap: 4,
              }}>
                {result.errors.map((e, i) => (
                  <div key={i} style={{ color: "var(--red)" }}>{e}</div>
                ))}
              </div>
            </div>
          )}

          <button className="btn btn-primary" onClick={reset}>Import Another File</button>
        </div>
      )}
    </>
  );
}
