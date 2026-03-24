import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken, getTokenFromRequest } from "@/lib/auth";
import { writeAuditLog } from "@/lib/auditLog";

// Expected CSV columns (case-insensitive headers):
// name, address, city, state, contactPerson, contactPhone, latitude, longitude, pipelineStage

export async function POST(req: Request) {
  try {
    const token = getTokenFromRequest(req);
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const decoded = verifyToken(token);
    if (!decoded || !decoded.roles.includes("ADMIN")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { csv } = body;

    if (!csv || typeof csv !== "string") {
      return NextResponse.json({ error: "CSV content is required" }, { status: 400 });
    }

    const VALID_STAGES = [
      "LEAD", "CONTACTED", "VISITED",
      "PROPOSAL_SENT", "NEGOTIATION",
      "CLOSED_WON", "CLOSED_LOST",
    ];

    const lines  = csv.trim().split("\n").map((l) => l.trim()).filter(Boolean);
    if (lines.length < 2) {
      return NextResponse.json({ error: "CSV must have a header row and at least one data row" }, { status: 400 });
    }

    // Parse headers (trim, lowercase, remove BOM)
    const headers = lines[0]
      .replace(/^\uFEFF/, "")
      .split(",")
      .map((h) => h.trim().toLowerCase().replace(/[^a-z]/g, ""));

    const required = ["name", "address", "city", "state"];
    const missing  = required.filter((r) => !headers.includes(r));
    if (missing.length > 0) {
      return NextResponse.json({
        error: `Missing required columns: ${missing.join(", ")}. Required: name, address, city, state`,
      }, { status: 400 });
    }

    const idx = (col: string) => headers.indexOf(col);

    const results = { created: 0, skipped: 0, errors: [] as string[] };

    for (let i = 1; i < lines.length; i++) {
      const raw = lines[i];
      // Handle quoted fields with commas
      const cols = parseCSVLine(raw);

      const name = cols[idx("name")]?.trim();
      if (!name) {
        results.errors.push(`Row ${i + 1}: name is empty — skipped`);
        results.skipped++;
        continue;
      }

      const address      = cols[idx("address")]?.trim()      ?? "";
      const city         = cols[idx("city")]?.trim()          ?? "";
      const state        = cols[idx("state")]?.trim()         ?? "";
      const contactPerson= idx("contactperson")  >= 0 ? cols[idx("contactperson")]?.trim()  : undefined;
      const contactPhone = idx("contactphone")   >= 0 ? cols[idx("contactphone")]?.trim()   : undefined;
      const stageRaw     = idx("pipelinestage")  >= 0 ? cols[idx("pipelinestage")]?.trim().toUpperCase() : undefined;

      // targetProduct: normalise display labels → internal values
      const productRaw   = idx("targetproduct")  >= 0 ? cols[idx("targetproduct")]?.trim()  : undefined;
      const serviceRaw   = idx("targetservices") >= 0 ? cols[idx("targetservices")]?.trim() : undefined;

      const PRODUCT_MAP: Record<string, string> = {
        "annual":              "ANNUAL",
        "nutshell paperbacks": "NUTSHELL_PAPERBACKS",
      };
      const SERVICE_MAP: Record<string, string> = {
        "quiz":              "QUIZ",
        "training":          "TRAINING",
        "classroom program": "CLASSROOM_PROGRAM",
      };

      const targetProduct  = productRaw  ? (PRODUCT_MAP[productRaw.toLowerCase()]  ?? productRaw.toUpperCase())  : null;
      const targetServices = serviceRaw  ? (SERVICE_MAP[serviceRaw.toLowerCase()]  ?? serviceRaw.toUpperCase())  : null;
      const pipelineStage  = stageRaw && VALID_STAGES.includes(stageRaw) ? stageRaw : "LEAD";

      if (!city || !state) {
        results.errors.push(`Row ${i + 1}: "${name}" missing city or state — skipped`);
        results.skipped++;
        continue;
      }

      try {
        await prisma.school.create({
          data: {
            name,
            address,
            city,
            state,
            contactPerson:  contactPerson  || null,
            contactPhone:   contactPhone   || null,
            targetProduct:  targetProduct  || null,
            targetServices: targetServices || null,
            pipelineStage:  pipelineStage as any,
          },
        });
        results.created++;
      } catch (e: any) {
        results.errors.push(`Row ${i + 1}: "${name}" — ${e.message ?? "DB error"}`);
        results.skipped++;
      }
    }

    await writeAuditLog({
      action:         "SCHOOLS_BULK_IMPORTED",
      entity:         "School",
      userId:         decoded.userId,
      organizationId: decoded.organizationId,
      metadata:       { created: results.created, skipped: results.skipped },
    });

    return NextResponse.json(results);
  } catch (error) {
    console.error("Bulk upload error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// Handles quoted CSV fields (e.g. "Smith, John" stays as one field)
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}