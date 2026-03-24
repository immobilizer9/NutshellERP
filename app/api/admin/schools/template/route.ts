import { NextResponse } from "next/server";
import { verifyToken, getTokenFromRequest } from "@/lib/auth";
import ExcelJS from "exceljs";

const GREEN  = { type: "pattern" as const, pattern: "solid" as const, fgColor: { argb: "FF22C55E" } };
const YELLOW = { type: "pattern" as const, pattern: "solid" as const, fgColor: { argb: "FFEAB308" } };
const WHITE  = { type: "pattern" as const, pattern: "solid" as const, fgColor: { argb: "FFFFFFFF" } };

const COLUMNS = [
  { header: "name",          label: "School Name",     required: true  },
  { header: "address",       label: "Address",         required: true  },
  { header: "city",          label: "City",            required: true  },
  { header: "state",         label: "State",           required: true  },
  { header: "contactPerson", label: "Contact Person",  required: false },
  { header: "contactPhone",  label: "Contact Phone",   required: false },
  { header: "pipelineStage", label: "Pipeline Stage",  required: false },
  { header: "targetProduct", label: "Target Product",  required: false },
  { header: "targetServices",label: "Target Services", required: false },
];

const EXAMPLE_ROWS = [
  ["St. Xavier's School", "12 Park Street",  "Kolkata",  "West Bengal", "Fr. John",    "9800000001", "LEAD",      "Annual",               "Quiz"],
  ["Springdale Academy",  "45 Hill Road",    "Siliguri", "West Bengal", "Mrs. Sharma", "9800000002", "VISITED",   "Nutshell Paperbacks",  "Training"],
];

export async function GET(req: Request) {
  try {
    const token = getTokenFromRequest(req);
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const decoded = verifyToken(token);
    if (!decoded || !decoded.roles.includes("ADMIN")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const wb = new ExcelJS.Workbook();
    wb.creator = "Nutshell ERP";

    // ── Main data sheet ─────────────────────────────────────────────
    const ws = wb.addWorksheet("Schools", {
      views: [{ state: "frozen", ySplit: 2 }],
    });

    // Row 1: human-readable labels (merged look via fill)
    const labelRow = ws.addRow(COLUMNS.map((c) => c.label));
    labelRow.eachCell((cell, col) => {
      const colDef = COLUMNS[col - 1];
      cell.fill    = colDef.required ? GREEN : YELLOW;
      cell.font    = { bold: true, color: { argb: "FF111827" }, size: 11 };
      cell.alignment = { horizontal: "center", vertical: "middle" };
      cell.border  = {
        bottom: { style: "thin", color: { argb: "FF6B7280" } },
      };
    });
    labelRow.height = 22;

    // Row 2: machine keys (what the API expects)
    const keyRow = ws.addRow(COLUMNS.map((c) => c.header));
    keyRow.eachCell((cell, col) => {
      const colDef = COLUMNS[col - 1];
      cell.fill  = colDef.required ? GREEN : YELLOW;
      cell.font  = { italic: true, color: { argb: "FF374151" }, size: 9 };
      cell.alignment = { horizontal: "center", vertical: "middle" };
      cell.border = {
        bottom: { style: "medium", color: { argb: "FF9CA3AF" } },
      };
    });
    keyRow.height = 16;

    // Example data rows
    for (const row of EXAMPLE_ROWS) {
      const r = ws.addRow(row);
      r.eachCell((cell) => {
        cell.fill = WHITE;
        cell.font = { color: { argb: "FF6B7280" }, italic: true };
      });
    }

    // Column widths
    const widths = [32, 28, 18, 18, 22, 18, 20, 24, 24];
    COLUMNS.forEach((_, i) => {
      ws.getColumn(i + 1).width = widths[i] ?? 20;
    });

    // ── Data validation dropdowns (rows 3–1002) ──────────────────────
    const PIPELINE_STAGES = "LEAD,CONTACTED,VISITED,PROPOSAL_SENT,NEGOTIATION,CLOSED_WON,CLOSED_LOST";
    const pipelineColLetter = colLetter(7); // pipelineStage = col 7
    const productColLetter  = colLetter(8); // targetProduct  = col 8
    const serviceColLetter  = colLetter(9); // targetServices = col 9

    for (let row = 3; row <= 1002; row++) {
      ws.getCell(`${pipelineColLetter}${row}`).dataValidation = {
        type: "list",
        allowBlank: true,
        formulae: [`"${PIPELINE_STAGES}"`],
        showErrorMessage: true,
        errorTitle: "Invalid stage",
        error: "Choose from the list",
      };
      ws.getCell(`${productColLetter}${row}`).dataValidation = {
        type: "list",
        allowBlank: true,
        formulae: ['"Annual,Nutshell Paperbacks"'],
        showErrorMessage: true,
        errorTitle: "Invalid product",
        error: "Choose Annual or Nutshell Paperbacks",
      };
      ws.getCell(`${serviceColLetter}${row}`).dataValidation = {
        type: "list",
        allowBlank: true,
        formulae: ['"Quiz,Training,Classroom Program"'],
        showErrorMessage: true,
        errorTitle: "Invalid service",
        error: "Choose from the list",
      };
    }

    // ── Legend sheet ──────────────────────────────────────────────────
    const legend = wb.addWorksheet("Instructions");
    legend.getColumn(1).width = 24;
    legend.getColumn(2).width = 60;

    const addLegendRow = (label: string, value: string, fill?: typeof GREEN) => {
      const r = legend.addRow([label, value]);
      if (fill) r.getCell(1).fill = fill;
      r.getCell(1).font = { bold: true };
      r.height = 18;
    };

    legend.addRow(["SCHOOL IMPORT INSTRUCTIONS", ""]).font = { bold: true, size: 13 };
    legend.addRow([]);
    addLegendRow("Green columns",  "Required — must be filled in every row", GREEN);
    addLegendRow("Yellow columns", "Optional — leave blank if unknown",       YELLOW);
    legend.addRow([]);
    legend.addRow(["FIELD NOTES", ""]).getCell(1).font = { bold: true };
    legend.addRow(["name",          "Full official name of the school"]);
    legend.addRow(["address",       "Street address"]);
    legend.addRow(["city",          "e.g. Kolkata, Siliguri, Delhi"]);
    legend.addRow(["state",         "e.g. West Bengal"]);
    legend.addRow(["contactPerson", "Principal or admin name"]);
    legend.addRow(["contactPhone",  "10-digit mobile number"]);
    legend.addRow(["pipelineStage", "Dropdown — defaults to LEAD if blank"]);
    legend.addRow(["targetProduct", "Dropdown — Annual or Nutshell Paperbacks"]);
    legend.addRow(["targetServices","Dropdown — Quiz, Training, or Classroom Program"]);
    legend.addRow([]);
    legend.addRow(["NOTE", "Delete the two example rows before uploading. Keep the header rows."]);

    // ── Serialise and return ─────────────────────────────────────────
    const buffer = await wb.xlsx.writeBuffer();
    return new Response(buffer, {
      headers: {
        "Content-Type":        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": 'attachment; filename="schools_import_template.xlsx"',
      },
    });
  } catch (err) {
    console.error("Template generation error:", err);
    return NextResponse.json({ error: "Failed to generate template" }, { status: 500 });
  }
}

function colLetter(n: number): string {
  let s = "";
  while (n > 0) {
    const rem = (n - 1) % 26;
    s = String.fromCharCode(65 + rem) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}
