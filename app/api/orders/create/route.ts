import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken, getTokenFromRequest } from "@/lib/auth";
import { generateOrderPdf } from "@/lib/generateOrderPdf";
import { sendOrderEmail } from "@/lib/sendOrderEmail";
import { writeAuditLog } from "@/lib/auditLog";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";

const ANNUAL_MRP: Record<number, number> = {
  1: 360, 2: 375, 3: 390, 4: 405,
  5: 420, 6: 435, 7: 455, 8: 470,
};
const PAPERBACK_MRP_PLAINS: Record<number, number> = {
  1: 600, 2: 600, 3: 660, 4: 660,
  5: 660, 6: 660, 7: 660, 8: 660,
};
const PAPERBACK_MRP_HILLS: Record<number, number> = {
  1: 600, 2: 600, 3: 600, 4: 600,
  5: 600, 6: 600, 7: 600, 8: 600,
};

function getMRP(classNum: number, productType: string): number {
  if (productType === "PAPERBACKS_HILLS")  return PAPERBACK_MRP_HILLS[classNum]  ?? 0;
  if (productType === "PAPERBACKS_PLAINS") return PAPERBACK_MRP_PLAINS[classNum] ?? 0;
  return ANNUAL_MRP[classNum] ?? 0;
}

export async function POST(req: Request) {
  try {
    const token = getTokenFromRequest(req);
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const decoded = verifyToken(token);
    if (!decoded) return NextResponse.json({ error: "Invalid token" }, { status: 401 });

    // ✅ Both SALES and BD_HEAD can create orders
    if (!decoded.roles.includes("SALES") && !decoded.roles.includes("BD_HEAD")) {
      return NextResponse.json(
        { error: "Only sales representatives and BD Heads can create orders" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const {
      schoolId,
      type        = "ORIGINAL",
      productType = "ANNUAL",
      schoolEmail,
      schoolPhone,
      address1,
      address2,
      pincode,
      orderDate,
      deliveryDate,
      // ✅ Vendor fields
      vendorName,
      vendorPhone,
      vendorEmail,
      vendorAddress,
      items,
      pocs = [],
    } = body;

    // ── Validation ──────────────────────────────────────────────────
    if (!schoolId)              return NextResponse.json({ error: "schoolId is required" }, { status: 400 });
    if (!items || !items.length) return NextResponse.json({ error: "At least one class is required" }, { status: 400 });

    const validTypes        = ["ORIGINAL", "ADDITIONAL"];
    const validProductTypes = ["ANNUAL", "PAPERBACKS_PLAINS", "PAPERBACKS_HILLS"];
    if (!validTypes.includes(type))              return NextResponse.json({ error: `Invalid type` }, { status: 400 });
    if (!validProductTypes.includes(productType)) return NextResponse.json({ error: `Invalid productType` }, { status: 400 });

    for (const item of items) {
      if (!item.classNum || item.classNum < 1 || item.classNum > 8)
        return NextResponse.json({ error: `Invalid classNum: ${item.classNum}` }, { status: 400 });
      if (!item.quantity || item.quantity <= 0)
        return NextResponse.json({ error: "quantity must be > 0" }, { status: 400 });
    }

    // ── Enrich items ────────────────────────────────────────────────
    const enrichedItems = items.map((item: any) => {
      const mrp       = getMRP(item.classNum, productType);
      const unitPrice = item.agreedPrice ?? mrp;
      return { className: `Class ${item.classNum}`, quantity: item.quantity, mrp, unitPrice, total: item.quantity * unitPrice };
    });

    const grossAmount = enrichedItems.reduce((s: number, i: any) => s + i.total, 0);

    // ── Get creator details (for email + audit) ─────────────────────
    const creator = await prisma.user.findUnique({
      where:  { id: decoded.userId },
      select: { name: true, email: true, phone: true },
    });

    // ── Create order ────────────────────────────────────────────────
    const order = await prisma.$transaction(async (tx) => {
      return tx.order.create({
        data: {
          schoolId,
          createdById:  decoded.userId,
          type,
          productType,
          status:       "PENDING",
          grossAmount,
          netAmount:    grossAmount,
          schoolEmail:  schoolEmail  ?? null,
          schoolPhone:  schoolPhone  ?? null,
          address1:     address1     ?? null,
          address2:     address2     ?? null,
          pincode:      pincode      ?? null,
          orderDate:    orderDate    ? new Date(orderDate)    : null,
          deliveryDate: deliveryDate ? new Date(deliveryDate) : null,
          vendorName:   vendorName   ?? null,
          vendorPhone:  vendorPhone  ?? null,
          vendorEmail:  vendorEmail  ?? null,
          vendorAddress:vendorAddress?? null,
          items: { create: enrichedItems },
          pocs: {
            create: pocs
              .filter((p: any) => p.name || p.phone || p.email)
              .map((p: any) => ({ role: p.role, name: p.name || null, phone: p.phone || null, email: p.email || null })),
          },
        },
        include: {
          school:    true,
          createdBy: { select: { name: true, email: true, phone: true } },
          items:     true,
          pocs:      true,
        },
      });
    });

    // ── Audit log ───────────────────────────────────────────────────
    await writeAuditLog({
      action:         "ORDER_CREATED",
      entity:         "Order",
      entityId:       order.id,
      userId:         decoded.userId,
      userName:       creator?.name,
      organizationId: decoded.organizationId,
      metadata: {
        schoolId,
        grossAmount,
        productType,
        type,
      },
    });

    // ── Generate PDF ────────────────────────────────────────────────
    let pdfUrl: string | null = null;
    let pdfBuffer: Buffer | undefined;
    try {
      pdfBuffer = await generateOrderPdf(order as any);
      const pdfDir  = join(process.cwd(), "public", "pdfs");
      await mkdir(pdfDir, { recursive: true });
      const filename = `order_${order.id}.pdf`;
      await writeFile(join(pdfDir, filename), pdfBuffer);
      pdfUrl = `/pdfs/${filename}`;
      await prisma.order.update({ where: { id: order.id }, data: { pdfUrl } });
    } catch (e) {
      console.error("PDF generation failed:", e);
    }

    // ── Send emails ─────────────────────────────────────────────────
    // ✅ Send to school + vendor only (not POCs)
    const recipients: string[] = [];
    if (schoolEmail) recipients.push(schoolEmail);
    if (vendorEmail) recipients.push(vendorEmail);

    if (recipients.length > 0) {
      try {
        for (const to of recipients) {
          await sendOrderEmail({
            to,
            schoolName:    order.school.name,
            orderId:       order.id,
            productType:   order.productType,
            grossAmount:   order.grossAmount,
            salesRepName:  creator?.name   ?? "Sales Team",
            salesRepEmail: creator?.email  ?? "",
            salesRepPhone: creator?.phone  ?? undefined,   // ✅ phone included
            vendorName:    vendorName       ?? undefined,
            vendorPhone:   vendorPhone      ?? undefined,
            vendorEmail:   vendorEmail      ?? undefined,
            vendorAddress: vendorAddress    ?? undefined,
            orderDate:     order.orderDate    ? new Date(order.orderDate).toLocaleDateString("en-IN")    : undefined,
            deliveryDate:  order.deliveryDate ? new Date(order.deliveryDate).toLocaleDateString("en-IN") : undefined,
            items: order.items.map((i) => ({ className: i.className, quantity: i.quantity, unitPrice: i.unitPrice, total: i.total })),
            pdfBuffer,
          });
        }
      } catch (e) {
        console.error("Email failed:", e);
      }
    }

    return NextResponse.json({ ...order, pdfUrl });
  } catch (error) {
    console.error("Order create error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}