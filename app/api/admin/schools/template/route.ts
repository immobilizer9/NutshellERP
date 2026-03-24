import { NextResponse } from "next/server";
import { verifyToken, getTokenFromRequest } from "@/lib/auth";
import { Workbook } from "exceljs";

const GREEN  = { type: "pattern" as const, pattern: "solid" as const, fgColor: { argb: "FF22C55E" } };
const YELLOW = { type: "pattern" as const, pattern: "solid" as const, fgColor: { argb: "FFEAB308" } };
const WHITE  = { type: "pattern" as const, pattern: "solid" as const, fgColor: { argb: "FFFFFFFF" } };

const COLUMNS = [
  { key: "name",           label: "School Name",     required: true  },
  { key: "address",        label: "Address",         required: true  },
  { key: "city",           label: "City",            required: true  },
  { key: "state",          label: "State",           required: true  },
  { key: "contactPerson",  label: "Contact Person",  required: false },
  { key: "contactPhone",   label: "Contact Phone",   required: false },
  { key: "pipelineStage",  label: "Pipeline Stage",  required: false },
  { key: "targetProduct",  label: "Target Product",  required: false },
  { key: "targetServices", label: "Target Services", required: false },
];

const COL_WIDTHS = [32, 28, 18, 18, 22, 18, 22, 24, 24];

const EXAMPLE_ROWS = [
  ["St. Xavier's School", "12 Park Street",  "Kolkata",  "West Bengal", "Fr. John",    "9800000001", "LEAD",    "Annual",              "Quiz"],
  ["Springdale Academy",  "45 Hill Road",    "Siliguri", "West Bengal", "Mrs. Sharma", "9800000002", "VISITED", "Nutshell Paperbacks", "Training"],
];

export async function GET(req: Request) {
  try {
    const token = getTokenFromRequest(req);
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const decoded = verifyToken(token);
    if (!decoded || !decoded.roles.includes("ADMIN")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const wb = new Workbook();
    wb.creator = "Nutshell ERP";
    wb.created = new Date();

    // ── Main sheet ────────────────────────────────────────────────────
    const ws = wb.addWorksheet("Schools", {
      views: [{ state: "frozen", ySplit: 2 }],
    });

    // Row 1 — Human-readable labels
    const labelRow = ws.addRow(COLUMNS.map((c) => c.label));
    labelRow.height = 22;
    labelRow.eachCell((cell, col) => {
      const required = COLUMNS[col - 1].required;
      cell.fill      = required ? GREEN : YELLOW;
      cell.font      = { bold: true, color: { argb: "FF111827" }, size: 11 };
      cell.alignment = { horizontal: "center", vertical: "middle", wrapText: false };
      cell.border    = { bottom: { style: "thin", color: { argb: "FF6B7280" } } };
    });

    // Row 2 — Machine keys (what the CSV parser reads)
    const keyRow = ws.addRow(COLUMNS.map((c) => c.key));
    keyRow.height = 16;
    keyRow.eachCell((cell, col) => {
      const required = COLUMNS[col - 1].required;
      cell.fill      = required ? GREEN : YELLOW;
      cell.font      = { italic: true, color: { argb: "FF374151" }, size: 9 };
      cell.alignment = { horizontal: "center", vertical: "middle" };
      cell.border    = { bottom: { style: "medium", color: { argb: "FF374151" } } };
    });

    // Example data rows
    for (const rowData of EXAMPLE_ROWS) {
      const r = ws.addRow(rowData);
      r.eachCell((cell) => {
        cell.fill = WHITE;
        cell.font = { color: { argb: "FF6B7280" }, italic: true, size: 10 };
      });
    }

    // Column widths
    COLUMNS.forEach((_, i) => {
      ws.getColumn(i + 1).width = COL_WIDTHS[i] ?? 20;
    });

    // Dropdowns on rows 3–202 (columns 7, 8, 9)
    const PIPELINE = '"LEAD,CONTACTED,VISITED,PROPOSAL_SENT,NEGOTIATION,CLOSED_WON,CLOSED_LOST"';
    const PRODUCTS = '"Annual,Nutshell Paperbacks"';
    const SERVICES = '"Quiz,Training,Classroom Program"';

    for (let row = 3; row <= 202; row++) {
      ws.getCell(`G${row}`).dataValidation = {
        type: "list", allowBlank: true, formulae: [PIPELINE],
        showErrorMessage: true, errorTitle: "Invalid stage", error: "Choose from the dropdown list",
      };
      ws.getCell(`H${row}`).dataValidation = {
        type: "list", allowBlank: true, formulae: [PRODUCTS],
        showErrorMessage: true, errorTitle: "Invalid product", error: "Choose Annual or Nutshell Paperbacks",
      };
      ws.getCell(`I${row}`).dataValidation = {
        type: "list", allowBlank: true, formulae: [SERVICES],
        showErrorMessage: true, errorTitle: "Invalid service", error: "Choose from the dropdown list",
      };
    }

    // ── Instructions sheet ────────────────────────────────────────────
    const info = wb.addWorksheet("Instructions");
    info.getColumn(1).width = 22;
    info.getColumn(2).width = 58;

    const addRow = (a: string, b: string, bold = false, fill?: typeof GREEN) => {
      const r = info.addRow([a, b]);
      r.height = 18;
      if (bold) { r.getCell(1).font = { bold: true }; r.getCell(2).font = { bold: true }; }
      if (fill) r.getCell(1).fill = fill;
    };

    addRow("SCHOOL IMPORT TEMPLATE", "", true);
    info.addRow([]);
    addRow("Colour guide", "", true);
    addRow("Green header",  "Required column — must be filled for every row", false, GREEN);
    addRow("Yellow header", "Optional column — leave blank if not known",     false, YELLOW);
    info.addRow([]);
    addRow("Instructions", "", true);
    addRow("1.", "Delete the two grey example rows before uploading");
    addRow("2.", "Keep both header rows (row 1 and row 2) — do not delete them");
    addRow("3.", "For dropdown columns, click the cell to see the list of options");
    addRow("4.", "Save the file as CSV before uploading (File → Save As → CSV)");
    info.addRow([]);
    addRow("Pipeline Stage values", "", true);
    for (const s of ["LEAD","CONTACTED","VISITED","PROPOSAL_SENT","NEGOTIATION","CLOSED_WON","CLOSED_LOST"]) {
      addRow("", s);
    }
    info.addRow([]);
    addRow("Target Product values", "", true);
    addRow("", "Annual");
    addRow("", "Nutshell Paperbacks");
    info.addRow([]);
    addRow("Target Services values", "", true);
    addRow("", "Quiz");
    addRow("", "Training");
    addRow("", "Classroom Program");

    // ── Write & return ────────────────────────────────────────────────
    const buffer = await wb.xlsx.writeBuffer();

    return new Response(buffer, {
      headers: {
        "Content-Type":        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": 'attachment; filename="schools_import_template.xlsx"',
        "Cache-Control":       "no-store",
      },
    });

  } catch (err) {
    console.error("[template] generation error:", err);
    return NextResponse.json({ error: "Failed to generate template" }, { status: 500 });
  }
}
