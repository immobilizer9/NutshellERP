import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken, getTokenFromRequest, hasModule } from "@/lib/auth";
import { sendOrderEmail } from "@/lib/sendOrderEmail";
import { writeAuditLog } from "@/lib/auditLog";

export async function POST(req: Request) {
  try {
    const token = getTokenFromRequest(req);
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const decoded = verifyToken(token);
    if (!decoded || (!hasModule(decoded, "TEAM_MANAGEMENT"))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { orderId } = await req.json();
    if (!orderId) return NextResponse.json({ error: "orderId is required" }, { status: 400 });

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        school:    { select: { id: true, name: true, pipelineStage: true } },
        createdBy: { select: { id: true, name: true, email: true, phone: true, managerId: true, organizationId: true } },
        items:     { select: { className: true, quantity: true, unitPrice: true, total: true } },
      },
    });

    if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });

    // BD_HEAD can only approve orders from their own team
    if (!hasModule(decoded, "USER_MANAGEMENT") && order.createdBy.managerId !== decoded.userId) {
      return NextResponse.json({ error: "Not allowed" }, { status: 403 });
    }

    if (order.status !== "PENDING") {
      return NextResponse.json(
        { error: `Order is already ${order.status.toLowerCase()}` },
        { status: 400 }
      );
    }

    const updated = await prisma.order.update({
      where: { id: orderId },
      data: { status: "APPROVED" },
    });

    // Advance pipeline stage if still early-stage
    if (order.school.pipelineStage === "LEAD" || order.school.pipelineStage === "CONTACTED") {
      await prisma.school.update({
        where: { id: order.school.id },
        data:  { pipelineStage: "PROPOSAL_SENT" },
      });
    }

    writeAuditLog({
      userId:         decoded.userId,
      organizationId: order.createdBy.organizationId,
      action:         "ORDER_APPROVED",
      entity:         "Order",
      entityId:       orderId,
      metadata: {
        schoolName:  order.school.name,
        netAmount:   order.netAmount,
        grossAmount: order.grossAmount,
        productType: order.productType,
        createdById: order.createdBy.id,
      },
    }).catch(() => {});

    // Notify the sales rep
    await (prisma as any).notification.create({
      data: {
        userId:         order.createdBy.id,
        organizationId: order.createdBy.organizationId,
        type:           "ORDER_APPROVED",
        title:          "Order Approved",
        message:        `Your order for ${order.school.name} has been approved!`,
        entityType:     "Order",
        entityId:       orderId,
      },
    });

    // Send approval email to school (non-blocking)
    if (order.schoolEmail) {
      sendOrderEmail({
        to:            order.schoolEmail,
        schoolName:    order.school.name,
        orderId:       order.id,
        productType:   order.productType,
        grossAmount:   order.grossAmount,
        salesRepName:  order.createdBy.name,
        salesRepEmail: order.createdBy.email,
        salesRepPhone: order.createdBy.phone ?? undefined,
        vendorName:    order.vendorName   ?? undefined,
        vendorPhone:   order.vendorPhone  ?? undefined,
        vendorEmail:   order.vendorEmail  ?? undefined,
        vendorAddress: order.vendorAddress ?? undefined,
        items:         order.items,
      }).catch((err) => console.error("Approval email failed:", err));
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Approve order error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
