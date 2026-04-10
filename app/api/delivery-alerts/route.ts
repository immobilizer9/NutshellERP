import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken, getTokenFromRequest, hasModule } from "@/lib/auth";

// GET /api/delivery-alerts
// Returns APPROVED orders with deliveryDate within the next N days (default 7)
// that are NOT yet delivered (deliveryStatus !== "DELIVERED")
// Role-based filtering: SALES sees own, BD sees team, ADMIN sees all
export async function GET(req: Request) {
  try {
    const token = getTokenFromRequest(req);
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const decoded = verifyToken(token);
    if (!decoded) return NextResponse.json({ error: "Invalid token" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const daysParam = searchParams.get("days");
    const horizon   = parseInt(daysParam ?? "7");

    const now     = new Date();
    const future  = new Date();
    future.setDate(future.getDate() + horizon);

    let createdByWhere: any = undefined;

    if (hasModule(decoded, "ORDERS") && !hasModule(decoded, "TEAM_MANAGEMENT")) {
      createdByWhere = decoded.userId;
    } else if (hasModule(decoded, "TEAM_MANAGEMENT")) {
      const team = await prisma.user.findMany({
        where:  { managerId: decoded.userId },
        select: { id: true },
      });
      const teamIds = [decoded.userId, ...team.map((u) => u.id)];
      createdByWhere = { in: teamIds };
    }
    // ADMIN: no filter

    const where: any = {
      status:         "APPROVED",
      deliveryStatus: { not: "DELIVERED" },
      deliveryDate:   { not: null, lte: future },
    };

    if (createdByWhere !== undefined) {
      where.createdById = createdByWhere;
    }

    const orders = await prisma.order.findMany({
      where,
      orderBy: { deliveryDate: "asc" },
      include: {
        school:    { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true } },
      },
    });

    const alerts = orders.map((o) => {
      const dueDate  = new Date(o.deliveryDate!);
      const daysLeft = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      return {
        id:             o.id,
        school:         o.school,
        createdBy:      o.createdBy,
        netAmount:      o.netAmount,
        productType:    o.productType,
        deliveryDate:   o.deliveryDate,
        deliveryStatus: o.deliveryStatus,
        paymentStatus:  o.paymentStatus,
        daysLeft,
        isOverdue:      daysLeft < 0,
      };
    });

    return NextResponse.json(alerts);
  } catch (err) {
    console.error("Delivery alerts GET error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
