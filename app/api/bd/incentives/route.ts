import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken, getTokenFromRequest } from "@/lib/auth";

export async function GET(req: Request) {
  try {
    const token = getTokenFromRequest(req);
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const decoded = verifyToken(token);
    const isAdmin  = decoded?.roles.includes("ADMIN");
    const isBdHead = decoded?.roles.includes("BD_HEAD");
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

    const results = await Promise.all(team.map(async (member) => {
      const target = await (prisma as any).target.findUnique({
        where: { userId_month_year: { userId: member.id, month, year } },
      });

      const approvedOrders = await prisma.order.findMany({
        where: { createdById: member.id, status: "APPROVED", createdAt: { gte: start, lt: end } },
        select: { netAmount: true },
      });

      const achievedRevenue  = approvedOrders.reduce((s: number, o: any) => s + o.netAmount, 0);
      const achievedOrders   = approvedOrders.length;
      const revenueTarget    = target?.revenueTarget    ?? 0;
      const ordersTarget     = target?.ordersTarget     ?? 0;
      const incentivePercent = target?.incentivePercent ?? 0;
      const incentiveEarned  = (achievedRevenue * incentivePercent) / 100;
      const achievementPct   = revenueTarget > 0 ? (achievedRevenue / revenueTarget) * 100 : 0;

      return {
        userId: member.id, name: member.name,
        revenueTarget, achievedRevenue, ordersTarget, achievedOrders,
        incentivePercent, incentiveEarned, achievementPct,
      };
    }));

    return NextResponse.json(results);
  } catch (err) {
    console.error("Incentives error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
