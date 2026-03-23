import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken, getTokenFromRequest } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const token = getTokenFromRequest(req);
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const decoded = verifyToken(token);
    if (!decoded || (!decoded.roles.includes("BD_HEAD") && !decoded.roles.includes("ADMIN"))) {
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
    if (decoded.roles.includes("BD_HEAD") && order.createdBy.managerId !== decoded.userId) {
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
