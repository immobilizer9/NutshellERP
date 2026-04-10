import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken, getTokenFromRequest, hasModule } from "@/lib/auth";
import { writeAuditLog } from "@/lib/auditLog";

export async function POST(req: Request) {
  try {
    const token = getTokenFromRequest(req);
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const decoded = verifyToken(token);
    if (!decoded) return NextResponse.json({ error: "Invalid token" }, { status: 401 });

    const isBDorAdmin = hasModule(decoded, "TEAM_MANAGEMENT") || hasModule(decoded, "USER_MANAGEMENT");
    if (!isBDorAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = await req.json();
    const { orderId, paymentStatus, paidAmount, deliveryStatus } = body;

    if (!orderId) return NextResponse.json({ error: "orderId is required" }, { status: 400 });

    const validPayment  = ["UNPAID", "PARTIAL", "PAID"];
    const validDelivery = ["PENDING", "DISPATCHED", "DELIVERED"];

    if (paymentStatus  && !validPayment.includes(paymentStatus))  return NextResponse.json({ error: "Invalid paymentStatus"  }, { status: 400 });
    if (deliveryStatus && !validDelivery.includes(deliveryStatus)) return NextResponse.json({ error: "Invalid deliveryStatus" }, { status: 400 });

    // Fetch order for org context
    const existing = await prisma.order.findUnique({
      where: { id: orderId },
      select: { id: true, createdBy: { select: { organizationId: true } } },
    });
    if (!existing) return NextResponse.json({ error: "Order not found" }, { status: 404 });

    const data: any = {};
    if (paymentStatus  !== undefined) data.paymentStatus  = paymentStatus;
    if (paidAmount     !== undefined) data.paidAmount     = Number(paidAmount);
    if (deliveryStatus !== undefined) {
      data.deliveryStatus = deliveryStatus;
      if (deliveryStatus === "DELIVERED")   data.deliveredAt   = new Date();
      if (deliveryStatus === "DISPATCHED")  data.deliveredAt   = null;
      if (deliveryStatus === "PENDING")     data.deliveredAt   = null;
    }

    const order = await prisma.order.update({ where: { id: orderId }, data });

    // ✅ Audit every payment/delivery status change
    const changes: Record<string, any> = {};
    if (paymentStatus  !== undefined) changes.paymentStatus  = paymentStatus;
    if (paidAmount     !== undefined) changes.paidAmount     = Number(paidAmount);
    if (deliveryStatus !== undefined) changes.deliveryStatus = deliveryStatus;

    writeAuditLog({
      action:         "ORDER_STATUS_UPDATED",
      entity:         "Order",
      entityId:       orderId,
      userId:         decoded.userId,
      organizationId: existing.createdBy.organizationId,
      metadata:       changes,
    }).catch(() => {});

    return NextResponse.json(order);
  } catch (err) {
    console.error("update-status error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
