import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken, getTokenFromRequest, hasModule } from "@/lib/auth";
import { writeAuditLog } from "@/lib/auditLog";
import { parseCSVLine } from "@/lib/csvParse";

// Expected CSV columns (case-insensitive, spaces stripped):
//   Required : name, address, city, state
//   Optional : classes, studentStrength, studentFees
//              contact1Name, contact1Designation, contact1Phone1, contact1Phone2
//              contact2Name, contact2Designation, contact2Phone1, contact2Phone2
//              contact3Name, contact3Designation, contact3Phone1, contact3Phone2
//              pipelineStage, targetProduct, targetServices
//   Legacy   : contactPerson, contactPhone  (mapped to contact1 if contact1Name absent)

const VALID_STAGES = [
  "LEAD", "CONTACTED", "VISITED",
  "PROPOSAL_SENT", "NEGOTIATION",
  "CLOSED_WON", "CLOSED_LOST",
];

const PRODUCT_MAP: Record<string, string> = {
  "annual":              "ANNUAL",
  "nutshell paperbacks": "NUTSHELL_PAPERBACKS",
};
const SERVICE_MAP: Record<string, string> = {
  "quiz":              "QUIZ",
  "training":          "TRAINING",
  "classroom program": "CLASSROOM_PROGRAM",
};

export async function POST(req: Request) {
  try {
    const token = getTokenFromRequest(req);
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const decoded = verifyToken(token);
    if (!decoded || !hasModule(decoded, "SCHOOLS")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { csv } = body;

    if (!csv || typeof csv !== "string") {
      return NextResponse.json({ error: "CSV content is required" }, { status: 400 });
    }

    const lines = csv.trim().split("\n").map((l) => l.trim()).filter(Boolean);
    if (lines.length < 2) {
      return NextResponse.json({ error: "CSV must have a header row and at least one data row" }, { status: 400 });
    }

    // Parse headers — strip BOM, lowercase, remove non-alphanumeric chars
    const rawHeaders = lines[0].replace(/^\uFEFF/, "");
    const headers = parseCSVLine(rawHeaders).map((h) =>
      h.trim().toLowerCase().replace(/[^a-z0-9]/g, "")
    );

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
      const cols = parseCSVLine(lines[i]);

      const name = cols[idx("name")]?.trim();
      if (!name) {
        results.errors.push(`Row ${i + 1}: name is empty — skipped`);
        results.skipped++;
        continue;
      }

      const address = cols[idx("address")]?.trim() ?? "";
      const city    = cols[idx("city")]?.trim()    ?? "";
      const state   = cols[idx("state")]?.trim()   ?? "";

      if (!city || !state) {
        results.errors.push(`Row ${i + 1}: "${name}" missing city or state — skipped`);
        results.skipped++;
        continue;
      }

      // ── School info fields ────────────────────────────────────────
      const classes         = idx("classes")         >= 0 ? cols[idx("classes")]?.trim()        || null : null;
      const strengthRaw     = idx("studentstrength") >= 0 ? cols[idx("studentstrength")]?.trim() : undefined;
      const feesRaw         = idx("studentfees")     >= 0 ? cols[idx("studentfees")]?.trim()     : undefined;
      const studentStrength = strengthRaw ? (parseInt(strengthRaw) || null) : null;
      const studentFees     = feesRaw     ? (parseInt(feesRaw)     || null) : null;

      // ── Pipeline fields ───────────────────────────────────────────
      const stageRaw   = idx("pipelinestage")  >= 0 ? cols[idx("pipelinestage")]?.trim().toUpperCase() : undefined;
      const productRaw = idx("targetproduct")  >= 0 ? cols[idx("targetproduct")]?.trim()               : undefined;
      const serviceRaw = idx("targetservices") >= 0 ? cols[idx("targetservices")]?.trim()              : undefined;

      const targetProduct  = productRaw ? (PRODUCT_MAP[productRaw.toLowerCase()]  ?? productRaw.toUpperCase())  : null;
      const targetServices = serviceRaw ? (SERVICE_MAP[serviceRaw.toLowerCase()]  ?? serviceRaw.toUpperCase())  : null;
      const pipelineStage  = stageRaw && VALID_STAGES.includes(stageRaw) ? stageRaw : "LEAD";

      // ── Contacts ──────────────────────────────────────────────────
      // Build up to 3 contacts from numbered columns.
      // Legacy columns (contactPerson / contactPhone) fall back to contact 1.
      const legacyName  = idx("contactperson") >= 0 ? cols[idx("contactperson")]?.trim() : undefined;
      const legacyPhone = idx("contactphone")  >= 0 ? cols[idx("contactphone")]?.trim()  : undefined;

      type ContactDraft = { name: string; designation: string | null; phones: string[] };
      const contacts: ContactDraft[] = [];

      for (let n = 1; n <= 3; n++) {
        const nameKey  = `contact${n}name`;
        const desigKey = `contact${n}designation`;
        const ph1Key   = `contact${n}phone1`;
        const ph2Key   = `contact${n}phone2`;

        let cName  = idx(nameKey)  >= 0 ? cols[idx(nameKey)]?.trim()  ?? "" : "";
        let cDesig = idx(desigKey) >= 0 ? cols[idx(desigKey)]?.trim() ?? "" : "";
        let cPh1   = idx(ph1Key)   >= 0 ? cols[idx(ph1Key)]?.trim()   ?? "" : "";
        let cPh2   = idx(ph2Key)   >= 0 ? cols[idx(ph2Key)]?.trim()   ?? "" : "";

        // Legacy fallback for contact 1
        if (n === 1 && !cName && legacyName)  cName = legacyName;
        if (n === 1 && !cPh1  && legacyPhone) cPh1  = legacyPhone;

        if (!cName) continue;

        const phones = [cPh1, cPh2].filter(Boolean);
        contacts.push({ name: cName, designation: cDesig || null, phones });
      }

      // Keep flat contactPerson/contactPhone on School for search/display compatibility
      const contactPerson = contacts[0]?.name       ?? legacyName  ?? null;
      const contactPhone  = contacts[0]?.phones[0]  ?? legacyPhone ?? null;

      try {
        const school = await prisma.school.create({
          data: {
            name,
            address,
            city,
            state,
            classes,
            studentStrength,
            studentFees,
            contactPerson,
            contactPhone,
            targetProduct:  targetProduct  || null,
            targetServices: targetServices || null,
            pipelineStage:  pipelineStage as any,
          },
        });

        // Create SchoolPOC + phones for each contact
        for (const contact of contacts) {
          const poc = await prisma.schoolPOC.create({
            data: {
              schoolId:    school.id,
              name:        contact.name,
              designation: contact.designation,
            },
          });
          for (let p = 0; p < contact.phones.length; p++) {
            await prisma.schoolPOCPhone.create({
              data: { pocId: poc.id, phone: contact.phones[p], order: p },
            });
          }
        }

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
