// app/api/admin/export-sheets/route.ts
//
// Exports all APPROVED orders to Google Sheets on demand.
// Accessible by ADMIN and BD_HEAD.
//
// Setup:
// 1. Create a Google Cloud project and enable Google Sheets API
// 2. Create a Service Account, download the JSON key
// 3. Share your target spreadsheet with the service account email
// 4. Add to .env:
//      GOOGLE_SERVICE_ACCOUNT_EMAIL=your-sa@project.iam.gserviceaccount.com
//      GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
//      GOOGLE_SHEETS_ID=your-spreadsheet-id
//
// Install: npm install googleapis

import { NextResponse } from "next/server";
import { google } from "googleapis";
import { prisma } from "@/lib/prisma";
import { verifyToken, getTokenFromRequest } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const token = getTokenFromRequest(req);
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const decoded = verifyToken(token);
    if (!decoded) return NextResponse.json({ error: "Invalid token" }, { status: 401 });

    const isAllowed =
      decoded.roles.includes("ADMIN") || decoded.roles.includes("BD_HEAD");

    if (!isAllowed) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // ── Fetch approved orders ──────────────────────────────────────
    // BD_HEAD sees only their team's orders; ADMIN sees all
    let orderWhere: any = { status: "APPROVED" };

    if (!decoded.roles.includes("ADMIN")) {
      const team = await prisma.user.findMany({
        where:  { managerId: decoded.userId },
        select: { id: true },
      });
      orderWhere.createdById = { in: team.map((u) => u.id) };
    }

    const orders = await prisma.order.findMany({
      where:   orderWhere,
      include: {
        school:    true,
        createdBy: { select: { name: true, email: true } },
        items:     true,
        pocs:      true,
      },
      orderBy: { createdAt: "desc" },
    });

    if (orders.length === 0) {
      return NextResponse.json({ message: "No approved orders to export.", rows: 0 });
    }

    // ── Authenticate with Google ───────────────────────────────────
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL!,
        private_key:  process.env.GOOGLE_PRIVATE_KEY!.replace(/\\n/g, "\n"),
      },
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });

    const sheets     = google.sheets({ version: "v4", auth });
    const spreadsheetId = process.env.GOOGLE_SHEETS_ID!;

    // ── Ensure sheets exist ────────────────────────────────────────
    const meta = await sheets.spreadsheets.get({ spreadsheetId });
    const existingSheets = meta.data.sheets?.map((s) => s.properties?.title) ?? [];

    const required = ["ORDERS", "ORDER_ITEMS", "POC"];
    const toCreate = required.filter((name) => !existingSheets.includes(name));

    if (toCreate.length > 0) {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
          requests: toCreate.map((title) => ({
            addSheet: { properties: { title } },
          })),
        },
      });
    }

    // ── Build row data ─────────────────────────────────────────────
    const orderRows: any[][] = [
      // Header
      [
        "Order ID", "Created At", "School", "City", "State",
        "Product Type", "Order Type", "Status",
        "Sales Rep", "Sales Email",
        "School Phone", "School Email",
        "Order Date", "Delivery Date",
        "Gross Amount", "Net Amount",
        "PDF URL",
      ],
    ];

    const itemRows: any[][] = [
      ["Order ID", "School", "Class", "Qty", "MRP", "Agreed Price", "Amount"],
    ];

    const pocRows: any[][] = [
      ["Order ID", "School", "Role", "Name", "Phone", "Email"],
    ];

    for (const order of orders) {
      orderRows.push([
        order.id,
        new Date(order.createdAt).toLocaleString("en-IN"),
        order.school.name,
        order.school.city,
        order.school.state,
        order.productType,
        order.type,
        order.status,
        order.createdBy.name,
        order.createdBy.email,
        order.schoolPhone  ?? "",
        order.schoolEmail  ?? "",
        order.orderDate    ? new Date(order.orderDate).toLocaleDateString("en-IN")    : "",
        order.deliveryDate ? new Date(order.deliveryDate).toLocaleDateString("en-IN") : "",
        order.grossAmount,
        order.netAmount,
        order.pdfUrl ?? "",
      ]);

      for (const item of order.items) {
        itemRows.push([
          order.id,
          order.school.name,
          item.className,
          item.quantity,
          item.mrp,
          item.unitPrice,
          item.total,
        ]);
      }

      for (const poc of order.pocs) {
        pocRows.push([
          order.id,
          order.school.name,
          poc.role,
          poc.name  ?? "",
          poc.phone ?? "",
          poc.email ?? "",
        ]);
      }
    }

    // ── Clear and write all three sheets ──────────────────────────
    const writeSheet = async (sheetName: string, data: any[][]) => {
      await sheets.spreadsheets.values.clear({
        spreadsheetId,
        range: `${sheetName}!A:Z`,
      });
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range:          `${sheetName}!A1`,
        valueInputOption: "RAW",
        requestBody:    { values: data },
      });
    };

    await writeSheet("ORDERS",      orderRows);
    await writeSheet("ORDER_ITEMS", itemRows);
    await writeSheet("POC",         pocRows);

    return NextResponse.json({
      success: true,
      message: `Exported ${orders.length} orders to Google Sheets.`,
      rows:    orders.length,
      sheetUrl: `https://docs.google.com/spreadsheets/d/${spreadsheetId}`,
    });
  } catch (error) {
    console.error("Sheets export error:", error);
    return NextResponse.json({ error: "Export failed" }, { status: 500 });
  }
}