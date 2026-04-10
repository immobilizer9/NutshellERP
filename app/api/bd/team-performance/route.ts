import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken, getTokenFromRequest, hasModule } from "@/lib/auth";

export async function GET(req: Request) {
  try {
    const token = getTokenFromRequest(req);
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const decoded = verifyToken(token);
    const isAdmin  = hasModule(decoded, "USER_MANAGEMENT");
    const isBdHead = hasModule(decoded, "TEAM_MANAGEMENT");
    if (!decoded || (!isAdmin && !isBdHead)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { searchParams } = new URL(req.url);
    const now   = new Date();
    const month = parseInt(searchParams.get("month") ?? String(now.getMonth() + 1));
    const year  = parseInt(searchParams.get("year")  ?? String(now.getFullYear()));

    const start = new Date(year, month - 1, 1);
    const end   = new Date(year, month, 1);

    const team = isAdmin
      ? await prisma.user.findMany({
          where: { organizationId: decoded.organizationId, roles: { some: { role: { name: "SALES" } } } },
          select: { id: true, name: true },
        })
      : await prisma.user.findMany({
          where: { managerId: decoded.userId },
          select: { id: true, name: true },
        });

    const members = await Promise.all(team.map(async (member) => {
      const target = await (prisma as any).target.findUnique({
        where: { userId_month_year: { userId: member.id, month, year } },
      });

      const approvedOrders = await prisma.order.findMany({
        where: { createdById: member.id, status: "APPROVED", createdAt: { gte: start, lt: end } },
        select: { netAmount: true },
      });
      const pendingOrderCount = await prisma.order.count({
        where: { createdById: member.id, status: "PENDING", createdAt: { gte: start, lt: end } },
      });

      const visits = await prisma.visit.findMany({
        where: { salesUserId: member.id, createdAt: { gte: start, lt: end } },
        select: { createdAt: true },
        orderBy: { createdAt: "desc" },
      });

      return {
        userId: member.id,
        name:   member.name,
        revenueTarget:   target?.revenueTarget ?? 0,
        achievedRevenue: approvedOrders.reduce((s: number, o: any) => s + o.netAmount, 0),
        ordersTarget:    target?.ordersTarget ?? 0,
        achievedOrders:  approvedOrders.length,
        pendingOrders:   pendingOrderCount,
        visitsThisMonth: visits.length,
        lastVisitDate:   visits[0]?.createdAt?.toISOString() ?? null,
      };
    }));

    const teamRevenue       = members.reduce((s, m) => s + m.achievedRevenue, 0);
    const teamRevenueTarget = members.reduce((s, m) => s + m.revenueTarget,   0);
    const teamOrders        = members.reduce((s, m) => s + m.achievedOrders,  0);
    const teamOrdersTarget  = members.reduce((s, m) => s + m.ordersTarget,    0);

    return NextResponse.json({ month, year, teamRevenue, teamRevenueTarget, teamOrders, teamOrdersTarget, members });
  } catch (err) {
    console.error("Team performance error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
