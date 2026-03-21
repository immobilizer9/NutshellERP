import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken, getTokenFromRequest } from "@/lib/auth";

// Expected CSV columns (header row):
// schoolName, salesRepEmail, productType, grossAmount, netAmount, orderDate, deliveryDate, status
// schoolName must match an existing school name exactly (case-insensitive)
// salesRepEmail must match an existing user email
// productType: ANNUAL | PAPERBACKS_PLAINS | PAPERBACKS_HILLS | NUTSHELL_ANNUAL | NUTSHELL_PAPERBACKS
// status: PENDING | APPROVED | REJECTED (default: PENDING)
// grossAmount, netAmount: numbers
// orderDate, deliveryDate: YYYY-MM-DD (optional)

const VALID_PRODUCT_TYPES = new Set([
  "ANNUAL", "PAPERBACKS_PLAINS", "PAPERBACKS_HILLS", "NUTSHELL_ANNUAL", "NUTSHELL_PAPERBACKS",
]);

const VALID_STATUSES = new Set(["PENDING", "APPROVED", "REJECTED"]);

function parseCSV(text: string): string[][] {
  const lines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim().split("\n");
  return lines.map((line) =>
    line.split(",").map((cell) => cell.trim().replace(/^"|"$/g, "").trim())
  );
}

export async function POST(req: Request) {
  try {
    const token = getTokenFromRequest(req);
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const decoded = verifyToken(token);
    if (!decoded || !decoded.roles.includes("ADMIN")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const formData = await req.formData();
    const file     = formData.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "No file uploaded" }, { status: 400 });

    const text = await file.text();
    const rows = parseCSV(text);

    if (rows.length < 2) {
      return NextResponse.json({ error: "CSV must have a header row and at least one data row" }, { status: 400 });
    }

    const header = rows[0].map((h) => h.toLowerCase().replace(/\s+/g, ""));
    const dataRows = rows.slice(1).filter((r) => r.some((c) => c)); // skip blank rows

    const COL = {
      schoolName:   header.indexOf("schoolname"),
      salesRepEmail: header.indexOf("salesrepemail"),
      productType:  header.indexOf("producttype"),
      grossAmount:  header.indexOf("grossamount"),
      netAmount:    header.indexOf("netamount"),
      orderDate:    header.indexOf("orderdate"),
      deliveryDate: header.indexOf("deliverydate"),
      status:       header.indexOf("status"),
    };

    const missing = Object.entries(COL)
      .filter(([k, v]) => v === -1 && k !== "orderDate" && k !== "deliveryDate" && k !== "status")
      .map(([k]) => k);
    if (missing.length) {
      return NextResponse.json({ error: `Missing required columns: ${missing.join(", ")}` }, { status: 400 });
    }

    // Pre-load schools and users for lookup
    const schools = await prisma.school.findMany({ select: { id: true, name: true } });
    const users   = await prisma.user.findMany({ select: { id: true, email: true, organizationId: true } });

    const schoolMap = new Map(schools.map((s) => [s.name.toLowerCase(), s]));
    const userMap   = new Map(users.map((u) => [u.email.toLowerCase(), u]));

    const results: { row: number; status: string; error?: string; orderId?: string }[] = [];
    let successCount = 0;

    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i];
      const rowNum = i + 2; // 1-indexed, skipping header

      const get = (col: number) => (col >= 0 && col < row.length ? row[col] : "");

      const schoolName   = get(COL.schoolName);
      const salesEmail   = get(COL.salesRepEmail).toLowerCase();
      const productType  = get(COL.productType).toUpperCase();
      const grossAmount  = parseFloat(get(COL.grossAmount));
      const netAmount    = parseFloat(get(COL.netAmount));
      const orderDateStr = COL.orderDate >= 0 ? get(COL.orderDate) : "";
      const delivDateStr = COL.deliveryDate >= 0 ? get(COL.deliveryDate) : "";
      const status       = COL.status >= 0 ? get(COL.status).toUpperCase() : "PENDING";

      // Validate
      if (!schoolName)  { results.push({ row: rowNum, status: "error", error: "Missing schoolName" }); continue; }
      if (!salesEmail)  { results.push({ row: rowNum, status: "error", error: "Missing salesRepEmail" }); continue; }
      if (!VALID_PRODUCT_TYPES.has(productType)) { results.push({ row: rowNum, status: "error", error: `Invalid productType: ${productType}` }); continue; }
      if (isNaN(grossAmount)) { results.push({ row: rowNum, status: "error", error: "Invalid grossAmount" }); continue; }
      if (isNaN(netAmount))   { results.push({ row: rowNum, status: "error", error: "Invalid netAmount" }); continue; }
      if (!VALID_STATUSES.has(status)) { results.push({ row: rowNum, status: "error", error: `Invalid status: ${status}` }); continue; }

      const school = schoolMap.get(schoolName.toLowerCase());
      if (!school) { results.push({ row: rowNum, status: "error", error: `School not found: ${schoolName}` }); continue; }

      const user = userMap.get(salesEmail);
      if (!user) { results.push({ row: rowNum, status: "error", error: `User not found: ${salesEmail}` }); continue; }

      try {
        const order = await prisma.order.create({
          data: {
            schoolId:    school.id,
            createdById: user.id,
            productType,
            grossAmount,
            netAmount,
            status,
            orderDate:    orderDateStr ? new Date(orderDateStr) : null,
            deliveryDate: delivDateStr ? new Date(delivDateStr) : null,
          },
        });
        results.push({ row: rowNum, status: "created", orderId: order.id });
        successCount++;
      } catch (err: any) {
        results.push({ row: rowNum, status: "error", error: err.message ?? "DB error" });
      }
    }

    return NextResponse.json({
      total:   dataRows.length,
      created: successCount,
      errors:  results.filter((r) => r.status === "error").length,
      results,
    });
  } catch (err) {
    console.error("Import POST error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
