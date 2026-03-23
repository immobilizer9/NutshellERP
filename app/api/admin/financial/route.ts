import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken, getTokenFromRequest } from "@/lib/auth";

export async function GET(req: Request) {
  try {
    const token = getTokenFromRequest(req);
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const decoded = verifyToken(token);
    if (!decoded || !decoded.roles.includes("ADMIN")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { searchParams } = new URL(req.url);
    const month = searchParams.get("month") ? parseInt(searchParams.get("month")!) : null;
    const year  = searchParams.get("year")  ? parseInt(searchParams.get("year")!)  : null;

    let dateFilter: any = {};
    if (month && year) {
      const start = new Date(year, month - 1, 1);
      const end   = new Date(year, month, 1);
      dateFilter  = { createdAt: { gte: start, lt: end } };
    }

    const orders = await prisma.order.findMany({
      where: { status: "APPROVED", ...dateFilter },
      select: {
        id: true, netAmount: true, paidAmount: true, grossAmount: true,
        paymentStatus: true, deliveryStatus: true, createdAt: true,
        school: { select: { name: true } },
      },
    });

    const returns = await prisma.return.findMany({
      where: { order: { status: "APPROVED", ...dateFilter } },
      select: { amount: true },
    });

    const totalRevenue     = orders.reduce((s, o) => s + o.netAmount,    0);
    const totalPaid        = orders.reduce((s, o) => s + o.paidAmount,   0);
    const totalOutstanding = totalRevenue - totalPaid;
    const totalReturns     = returns.reduce((s, r) => s + r.amount, 0);

    const paidOrders       = orders.filter((o) => o.paymentStatus  === "PAID").length;
    const partialOrders    = orders.filter((o) => o.paymentStatus  === "PARTIAL").length;
    const unpaidOrders     = orders.filter((o) => o.paymentStatus  === "UNPAID").length;
    const deliveredOrders  = orders.filter((o) => o.deliveryStatus === "DELIVERED").length;
    const dispatchedOrders = orders.filter((o) => o.deliveryStatus === "DISPATCHED").length;
    const pendingDelivery  = orders.filter((o) => o.deliveryStatus === "PENDING").length;

    // Recent 10 approved orders (no date filter)
    const recentOrders = await prisma.order.findMany({
      where: { status: "APPROVED" },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
        id: true, netAmount: true, paidAmount: true, paymentStatus: true, deliveryStatus: true, createdAt: true,
        school: { select: { name: true } },
      },
    });

    return NextResponse.json({
      totalRevenue, totalPaid, totalOutstanding, totalReturns,
      paidOrders, partialOrders, unpaidOrders,
      deliveredOrders, dispatchedOrders, pendingDelivery,
      recentOrders,
    });
  } catch (err) {
    console.error("Financial overview error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
