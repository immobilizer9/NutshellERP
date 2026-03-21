import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken, getTokenFromRequest } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const token = getTokenFromRequest(req);

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const decoded = verifyToken(token);

    if (!decoded) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const { orderId, itemId, quantity, reason } = await req.json();

    if (!orderId || !itemId || !quantity) {
      return NextResponse.json(
        { error: "orderId, itemId, and quantity are required" },
        { status: 400 }
      );
    }

    if (quantity <= 0) {
      return NextResponse.json(
        { error: "Return quantity must be greater than 0" },
        { status: 400 }
      );
    }

    // ✅ Verify the order exists and belongs to this user (unless ADMIN or BD_HEAD)
    const order = await prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const isAdminOrBD =
      decoded.roles.includes("ADMIN") || decoded.roles.includes("BD_HEAD");

    if (!isAdminOrBD && order.createdById !== decoded.userId) {
      return NextResponse.json({ error: "Not allowed" }, { status: 403 });
    }

    // ✅ Fetch item and its existing returns
    const item = await prisma.orderItem.findUnique({
      where: { id: itemId },
      include: { returns: true },
    });

    if (!item) {
      return NextResponse.json({ error: "Order item not found" }, { status: 404 });
    }

    if (item.orderId !== orderId) {
      return NextResponse.json(
        { error: "Item does not belong to this order" },
        { status: 400 }
      );
    }

    // ✅ Prevent over-returning
    const alreadyReturned = item.returns.reduce((sum, r) => sum + r.quantity, 0);

    if (alreadyReturned + quantity > item.quantity) {
      return NextResponse.json(
        {
          error: `Return quantity exceeds available. Already returned: ${alreadyReturned}, ordered: ${item.quantity}`,
        },
        { status: 400 }
      );
    }

    // ✅ Amount calculated server-side — never from client
    const amount = quantity * item.unitPrice;

    await prisma.return.create({
      data: {
        orderId,
        itemId,
        quantity,
        amount,
        reason: reason || null,
      },
    });

    // ✅ Recalculate netAmount from all returns on this order
    const updatedOrder = await prisma.order.findUnique({
      where: { id: orderId },
      include: { returns: true },
    });

    if (!updatedOrder) {
      return NextResponse.json({ error: "Order not found after return" }, { status: 500 });
    }

    const totalReturnAmount = updatedOrder.returns.reduce(
      (sum, r) => sum + r.amount,
      0
    );

    const newNetAmount = updatedOrder.grossAmount - totalReturnAmount;

    await prisma.order.update({
      where: { id: orderId },
      data: { netAmount: newNetAmount },
    });

    return NextResponse.json({
      success: true,
      returnedAmount: amount,
      newNetAmount,
    });
  } catch (error) {
    console.error("Return error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}