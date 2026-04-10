import { NextResponse } from "next/server";
import { verifyToken, getTokenFromRequest, hasModule } from "@/lib/auth";
import { Workbook } from "exceljs";

const GREEN  = { type: "pattern" as const, pattern: "solid" as const, fgColor: { argb: "FF22C55E" } };
const YELLOW = { type: "pattern" as const, pattern: "solid" as const, fgColor: { argb: "FFEAB308" } };
const BLUE   = { type: "pattern" as const, pattern: "solid" as const, fgColor: { argb: "FFdbeafe" } };
const WHITE  = { type: "pattern" as const, pattern: "solid" as const, fgColor: { argb: "FFFFFFFF" } };

const COLUMNS = [
  // Required
  { key: "name",                label: "School Name",           required: true,  group: "school"   },
  { key: "address",             label: "Address",               required: true,  group: "school"   },
  { key: "city",                label: "City",                  required: true,  group: "school"   },
  { key: "state",               label: "State",                 required: true,  group: "school"   },
  // School info
  { key: "classes",             label: "Classes",               required: false, group: "school"   },
  { key: "studentStrength",     label: "Student Strength",      required: false, group: "school"   },
  { key: "studentFees",         label: "Student Fees (₹/yr)",   required: false, group: "school"   },
  // Contact 1
  { key: "contact1Name",        label: "Contact 1 Name",        required: false, group: "contact"  },
  { key: "contact1Designation", label: "Contact 1 Designation", required: false, group: "contact"  },
  { key: "contact1Phone1",      label: "Contact 1 Phone 1",     required: false, group: "contact"  },
  { key: "contact1Phone2",      label: "Contact 1 Phone 2",     required: false, group: "contact"  },
  // Contact 2
  { key: "contact2Name",        label: "Contact 2 Name",        required: false, group: "contact"  },
  { key: "contact2Designation", label: "Contact 2 Designation", required: false, group: "contact"  },
  { key: "contact2Phone1",      label: "Contact 2 Phone 1",     required: false, group: "contact"  },
  { key: "contact2Phone2",      label: "Contact 2 Phone 2",     required: false, group: "contact"  },
  // Contact 3
  { key: "contact3Name",        label: "Contact 3 Name",        required: false, group: "contact"  },
  { key: "contact3Designation", label: "Contact 3 Designation", required: false, group: "contact"  },
  { key: "contact3Phone1",      label: "Contact 3 Phone 1",     required: false, group: "contact"  },
  { key: "contact3Phone2",      label: "Contact 3 Phone 2",     required: false, group: "contact"  },
  // Pipeline
  { key: "pipelineStage",       label: "Pipeline Stage",        required: false, group: "pipeline" },
  { key: "targetProduct",       label: "Target Product",        required: false, group: "pipeline" },
  { key: "targetServices",      label: "Target Services",       required: false, group: "pipeline" },
];

const COL_WIDTHS = [
  32, 28, 18, 18,   // name, address, city, state
  16, 18, 18,       // classes, strength, fees
  22, 24, 18, 18,   // contact1
  22, 24, 18, 18,   // contact2
  22, 24, 18, 18,   // contact3
  22, 24, 24,       // pipeline
];

const EXAMPLE_ROWS = [
  [
    "St. Xavier's School", "12 Park Street", "Kolkata", "West Bengal",
    "1-10", "800", "45000",
    "Fr. John", "Principal", "9800000001", "9800000002",
    "Mrs. Das", "Admin Head", "9800000003", "",
    "", "", "", "",
    "LEAD", "Annual", "Quiz",
  ],
  [
    "Springdale Academy", "45 Hill Road", "Siliguri", "West Bengal",
    "KG-12", "1200", "60000",
    "Mr. Sharma", "Director", "9800000004", "",
    "", "", "", "",
    "", "", "", "",
    "VISITED", "Nutshell Paperbacks", "Training",
  ],
];

export async function GET(req: Request) {
  try {
    const token = getTokenFromRequest(req);
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const decoded = verifyToken(token);
    if (!decoded || !hasModule(decoded, "SCHOOLS")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const wb = new Workbook();
    wb.creator = "Nutshell ERP";
    wb.created = new Date();

    // ── Main sheet ────────────────────────────────────────────────────
    const ws = wb.addWorksheet("Schools", {
      views: [{ state: "frozen", ySplit: 2 }],
    });

    const fillFor = (col: typeof COLUMNS[0]) => {
      if (col.required)          return GREEN;
      if (col.group === "contact") return BLUE;
      return YELLOW;
    };

    // Row 1 — Human-readable labels
    const labelRow = ws.addRow(COLUMNS.map((c) => c.label));
    labelRow.height = 22;
    labelRow.eachCell((cell, colIdx) => {
      const col = COLUMNS[colIdx - 1];
      cell.fill      = fillFor(col);
      cell.font      = { bold: true, color: { argb: "FF111827" }, size: 10 };
      cell.alignment = { horizontal: "center", vertical: "middle", wrapText: false };
      cell.border    = { bottom: { style: "thin", color: { argb: "FF6B7280" } } };
    });

    // Row 2 — Machine keys (what the CSV parser reads)
    const keyRow = ws.addRow(COLUMNS.map((c) => c.key));
    keyRow.height = 16;
    keyRow.eachCell((cell, colIdx) => {
      const col = COLUMNS[colIdx - 1];
      cell.fill      = fillFor(col);
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

    // Dropdowns — pipeline stage (col 20), product (col 21), services (col 22)
    const PIPELINE = '"LEAD,CONTACTED,VISITED,PROPOSAL_SENT,NEGOTIATION,CLOSED_WON,CLOSED_LOST"';
    const PRODUCTS = '"Annual,Nutshell Paperbacks"';
    const SERVICES = '"Quiz,Training,Classroom Program"';

    for (let row = 3; row <= 202; row++) {
      ws.getCell(`T${row}`).dataValidation = {
        type: "list", allowBlank: true, formulae: [PIPELINE],
        showErrorMessage: true, errorTitle: "Invalid stage", error: "Choose from the dropdown list",
      };
      ws.getCell(`U${row}`).dataValidation = {
        type: "list", allowBlank: true, formulae: [PRODUCTS],
        showErrorMessage: true, errorTitle: "Invalid product", error: "Choose Annual or Nutshell Paperbacks",
      };
      ws.getCell(`V${row}`).dataValidation = {
        type: "list", allowBlank: true, formulae: [SERVICES],
        showErrorMessage: true, errorTitle: "Invalid service", error: "Choose from the dropdown list",
      };
    }

    // ── Instructions sheet ────────────────────────────────────────────
    const info = wb.addWorksheet("Instructions");
    info.getColumn(1).width = 26;
    info.getColumn(2).width = 60;

    const addInfo = (a: string, b: string, bold = false, fill?: typeof GREEN) => {
      const r = info.addRow([a, b]);
      r.height = 18;
      if (bold) { r.getCell(1).font = { bold: true }; r.getCell(2).font = { bold: true }; }
      if (fill) r.getCell(1).fill = fill;
    };

    addInfo("SCHOOL IMPORT TEMPLATE", "", true);
    info.addRow([]);
    addInfo("Colour guide", "", true);
    addInfo("Green header",  "Required column — must be filled for every row",     false, GREEN);
    addInfo("Blue header",   "Contact person columns — repeat for up to 3 contacts", false, BLUE);
    addInfo("Yellow header", "Optional column — leave blank if not known",         false, YELLOW);
    info.addRow([]);
    addInfo("Instructions", "", true);
    addInfo("1.", "Delete the two grey example rows before uploading");
    addInfo("2.", "Keep both header rows (row 1 and row 2) — do not delete them");
    addInfo("3.", "For dropdown columns, click the cell to see the list of options");
    addInfo("4.", "Save the file as CSV before uploading (File → Save As → CSV)");
    addInfo("5.", "Each school can have up to 3 contact persons, each with up to 2 phone numbers");
    addInfo("6.", "Classes: enter as a range e.g. 1-10 or KG-12, or comma-separated e.g. 6,7,8");
    addInfo("7.", "Student Fees: annual fee per student in rupees (numbers only)");
    info.addRow([]);
    addInfo("Pipeline Stage values", "", true);
    for (const s of ["LEAD","CONTACTED","VISITED","PROPOSAL_SENT","NEGOTIATION","CLOSED_WON","CLOSED_LOST"]) {
      addInfo("", s);
    }
    info.addRow([]);
    addInfo("Target Product values", "", true);
    addInfo("", "Annual");
    addInfo("", "Nutshell Paperbacks");
    info.addRow([]);
    addInfo("Target Services values", "", true);
    addInfo("", "Quiz");
    addInfo("", "Training");
    addInfo("", "Classroom Program");

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
