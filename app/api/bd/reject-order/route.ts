import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken, getTokenFromRequest, hasModule } from "@/lib/auth";
import { writeAuditLog } from "@/lib/auditLog";

export async function POST(req: Request) {
  try {
    const token = getTokenFromRequest(req);
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const decoded = verifyToken(token);
    if (!decoded || (!hasModule(decoded, "TEAM_MANAGEMENT"))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { orderId, reason } = await req.json();
    if (!orderId) return NextResponse.json({ error: "orderId is required" }, { status: 400 });

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        school:    { select: { name: true } },
        createdBy: { select: { id: true, managerId: true, organizationId: true } },
      },
    });

    if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });

    // BD_HEAD can only reject orders from their own team
    if (!hasModule(decoded, "USER_MANAGEMENT") && order.createdBy.managerId !== decoded.userId) {
      return NextResponse.json({ error: "Not allowed" }, { status: 403 });
    }

    if (order.status !== "PENDING") {
      return NextResponse.json(
        { error: `Order is already ${order.status.toLowerCase()}` },
        { status: 400 }
      );
    }

    await prisma.order.update({
      where: { id: orderId },
      data: { status: "REJECTED", rejectionReason: reason ?? null },
    });

    writeAuditLog({
      userId:         decoded.userId,
      organizationId: order.createdBy.organizationId,
      action:         "ORDER_REJECTED",
      entity:         "Order",
      entityId:       orderId,
      metadata: {
        schoolName: order.school.name,
        reason:     reason ?? null,
        createdById: order.createdBy.id,
      },
    }).catch(() => {});

    // Notify the sales rep who created the order
    await (prisma as any).notification.create({
      data: {
        userId:         order.createdBy.id,
        organizationId: order.createdBy.organizationId,
        type:           "ORDER_REJECTED",
        title:          "Order Rejected",
        message:        reason
          ? `Your order for ${order.school.name} was rejected: "${reason}"`
          : `Your order for ${order.school.name} was rejected.`,
        entityType: "Order",
        entityId:   orderId,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Reject order error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
