import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken, getTokenFromRequest } from "@/lib/auth";

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const token = getTokenFromRequest(req);
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const decoded = verifyToken(token);
    if (!decoded) return NextResponse.json({ error: "Invalid token" }, { status: 401 });

    const order = await prisma.order.findUnique({
      where: { id: params.id },
      include: { items: true, returns: true },
    });
    if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
    if (order.status !== "PENDING") {
      return NextResponse.json({ error: "Only PENDING orders can be edited" }, { status: 400 });
    }
    const isAdmin = decoded.roles.includes("ADMIN");
    if (!isAdmin && order.createdById !== decoded.userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { items } = await req.json();

    if (Array.isArray(items) && items.length > 0) {
      await Promise.all(items.map((item: any) => {
        const qty   = Math.max(0, Number(item.quantity)  || 0);
        const price = Math.max(0, Number(item.unitPrice) || 0);
        return prisma.orderItem.update({
          where: { id: item.id },
          data: { quantity: qty, unitPrice: price, total: qty * price },
        });
      }));
    }

    // Recalculate totals
    const updatedItems = await prisma.orderItem.findMany({ where: { orderId: params.id } });
    const grossAmount  = updatedItems.reduce((s, i) => s + i.total, 0);
    const totalReturns = order.returns.reduce((s, r) => s + r.amount, 0);
    const netAmount    = Math.max(0, grossAmount - totalReturns);

    const updated = await prisma.order.update({
      where: { id: params.id },
      data:  { grossAmount, netAmount },
      include: { items: true, returns: true, school: true, createdBy: { select: { id: true, name: true } } },
    });

    return NextResponse.json(updated);
  } catch (err) {
    console.error("Order edit error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
