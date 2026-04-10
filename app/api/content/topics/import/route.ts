import { NextResponse } from "next/server";
import { google } from "googleapis";
import { prisma } from "@/lib/prisma";
import { verifyToken, getTokenFromRequest, hasModule } from "@/lib/auth";

// ── Helpers ───────────────────────────────────────────────────────────────────

function extractSheetId(input: string): string {
  const trimmed = input.trim();
  if (trimmed.includes("/")) {
    const match = trimmed.match(/\/d\/([a-zA-Z0-9-_]+)/);
    if (!match) throw new Error("Invalid Google Sheets URL.");
    return match[1];
  }
  if (!/^[a-zA-Z0-9-_]+$/.test(trimmed)) throw new Error("Invalid Google Sheets ID.");
  return trimmed;
}

const PRODUCT_MAP: Record<string, string> = {
  "annual":            "ANNUAL",
  "paperbacksplains":  "PAPERBACKS_PLAINS",
  "paperbackshills":   "PAPERBACKS_HILLS",
  "online":            "ONLINE",
};

const REQUIRED_COLS = ["title", "assignee", "producttype", "classfrom", "classto"];

// ── GET — return service account email for UI display ─────────────────────────

export async function GET(req: Request) {
  const token = getTokenFromRequest(req);
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const decoded = verifyToken(token);
  if (!decoded || !hasModule(decoded, "USER_MANAGEMENT")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return NextResponse.json({
    serviceAccountEmail: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL ?? "(not configured)",
  });
}

// ── POST — read sheet and return preview (no DB writes) ───────────────────────

export async function POST(req: Request) {
  try {
    const token = getTokenFromRequest(req);
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const decoded = verifyToken(token);
    if (!decoded || !hasModule(decoded, "USER_MANAGEMENT")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { sheetId: rawSheetId, sheetName } = body;

    if (!rawSheetId) {
      return NextResponse.json({ error: "sheetId is required" }, { status: 400 });
    }

    let sheetId: string;
    try {
      sheetId = extractSheetId(rawSheetId);
    } catch (e: any) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }

    // Authenticate with Google
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL!,
        private_key:  process.env.GOOGLE_PRIVATE_KEY!.replace(/\\n/g, "\n"),
      },
      scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
    });
    const sheets = google.sheets({ version: "v4", auth });

    // Read the sheet
    let values: any[][];
    try {
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: sheetId,
        range: sheetName || "Sheet1",
      });
      values = (response.data.values ?? []) as any[][];
    } catch (err: any) {
      const msg: string = err?.message ?? "";
      const saEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL ?? "(not configured)";
      if (msg.toLowerCase().includes("permission") || msg.includes("403")) {
        return NextResponse.json({
          error: `The sheet is not shared with our service account. Please share your sheet with: ${saEmail}`,
        }, { status: 403 });
      }
      if (msg.toLowerCase().includes("not found") || msg.includes("404")) {
        return NextResponse.json({
          error: "Sheet not found. Check the URL and that the sheet is shared correctly.",
        }, { status: 404 });
      }
      if (msg.toLowerCase().includes("invalid")) {
        return NextResponse.json({ error: "Invalid Google Sheets URL or ID." }, { status: 400 });
      }
      throw err;
    }

    if (values.length === 0) {
      return NextResponse.json({ error: "The sheet is empty." }, { status: 400 });
    }

    // Parse headers: normalize to lowercase, strip spaces
    const headerRow = values[0].map((h: any) =>
      String(h ?? "").toLowerCase().replace(/\s+/g, "")
    );

    const missing = REQUIRED_COLS.filter((c) => !headerRow.includes(c));
    if (missing.length > 0) {
      const labels: Record<string, string> = {
        title: "Title", assignee: "Assignee", producttype: "Product Type",
        classfrom: "Class From", classto: "Class To",
      };
      return NextResponse.json({
        error: `Missing required columns: ${missing.map((c) => labels[c] ?? c).join(", ")}`,
      }, { status: 400 });
    }

    const ci = (name: string) => headerRow.indexOf(name);

    // Data rows (skip blank rows)
    const dataRows = values.slice(1).filter((row) =>
      row.some((c: any) => c !== "" && c != null)
    );

    // Collect all unique assignee emails and do one DB lookup
    const emails = [...new Set(
      dataRows.map((row) => String(row[ci("assignee")] ?? "").trim().toLowerCase())
             .filter(Boolean)
    )];
    const users = await prisma.user.findMany({
      where: { email: { in: emails } },
      select: { id: true, email: true, name: true },
    });
    const userMap = new Map(users.map((u) => [u.email.toLowerCase(), u]));

    // Parse each row
    const rows: any[] = [];
    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i];
      const get = (col: string) => String(row[ci(col)] ?? "").trim();

      const title        = get("title");
      const assigneeRaw  = get("assignee").toLowerCase();
      const productRaw   = get("producttype").toLowerCase().replace(/\s+/g, "");
      const classFromRaw = get("classfrom");
      const classToRaw   = get("classto");
      const description  = ci("description") >= 0 ? get("description") : "";
      const dueDateRaw   = ci("duedate") >= 0 ? get("duedate") : "";

      const base = { rowNum: i + 2, title, assigneeEmail: assigneeRaw, productRaw, classFromRaw, classToRaw };

      if (!title) {
        rows.push({ ...base, error: "Title is empty" }); continue;
      }

      const productType = PRODUCT_MAP[productRaw];
      if (!productType) {
        rows.push({ ...base, error: `Unknown product type: "${get("producttype")}"` }); continue;
      }

      const classFrom = parseInt(classFromRaw);
      const classTo   = parseInt(classToRaw);
      if (isNaN(classFrom) || isNaN(classTo) || classFrom < 1 || classTo < 1) {
        rows.push({ ...base, productType, error: `Invalid class range: "${classFromRaw}"–"${classToRaw}"` }); continue;
      }

      const user = userMap.get(assigneeRaw);
      if (!user) {
        rows.push({ ...base, productType, classFrom, classTo, error: `User not found: ${assigneeRaw}. Make sure this user exists in the ERP.` }); continue;
      }

      // Parse due date
      let dueDate: string | null = null;
      if (dueDateRaw) {
        const ddmm = dueDateRaw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
        if (ddmm) {
          dueDate = `${ddmm[3]}-${ddmm[2].padStart(2, "0")}-${ddmm[1].padStart(2, "0")}`;
        } else if (/^\d{4}-\d{2}-\d{2}$/.test(dueDateRaw)) {
          dueDate = dueDateRaw;
        } else {
          rows.push({ ...base, productType, classFrom, classTo, error: `Invalid date: "${dueDateRaw}". Use DD/MM/YYYY or YYYY-MM-DD.` }); continue;
        }
      }

      rows.push({
        rowNum: i + 2,
        title,
        assigneeEmail: assigneeRaw,
        assigneeId:    user.id,
        assigneeName:  user.name,
        productType,
        classFrom,
        classTo,
        description:   description || null,
        dueDate,
        valid: true,
      });
    }

    const validCount = rows.filter((r) => r.valid).length;
    const errorCount = rows.filter((r) => r.error).length;

    return NextResponse.json({ rows, validCount, errorCount });
  } catch (error) {
    console.error("Sheet import preview error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
