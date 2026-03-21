import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken, getTokenFromRequest } from "@/lib/auth";

export async function GET(req: Request) {
  try {
    const token = getTokenFromRequest(req);
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const decoded = verifyToken(token);
    if (!decoded || !decoded.roles.includes("ADMIN")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // ── All approved orders ─────────────────────────────────────────
    const orders = await prisma.order.findMany({
      where: { status: "APPROVED" },
      include: {
        createdBy: { select: { id: true, name: true } },
        school:    { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "asc" },
    });

    // ── Latest 5 reports ────────────────────────────────────────────
    const reports = await prisma.dailyReport.findMany({
      include: { salesUser: { select: { id: true, name: true } } },
      orderBy: { createdAt: "desc" },
      take: 5,
    });

    // ── Summary stats ───────────────────────────────────────────────
    const totalOrders  = orders.length;
    const totalRevenue = orders.reduce((s, o) => s + o.netAmount, 0);

    // ── School pipeline breakdown ───────────────────────────────────
    const schoolCounts = await prisma.school.groupBy({
      by: ["pipelineStage"],
      _count: { id: true },
    });

    const pipelineBreakdown = schoolCounts.map((s) => ({
      stage: s.pipelineStage,
      count: s._count.id,
    }));

    // ── Monthly revenue (last 12 months) ────────────────────────────
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 11);
    twelveMonthsAgo.setDate(1);
    twelveMonthsAgo.setHours(0, 0, 0, 0);

    const recentOrders = orders.filter(
      (o) => new Date(o.createdAt) >= twelveMonthsAgo
    );

    // Build month buckets
    const monthMap: Record<string, { label: string; revenue: number; orders: number }> = {};
    for (let i = 0; i < 12; i++) {
      const d = new Date();
      d.setMonth(d.getMonth() - (11 - i));
      const key   = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const label = d.toLocaleDateString("en-IN", { month: "short", year: "2-digit" });
      monthMap[key] = { label, revenue: 0, orders: 0 };
    }

    recentOrders.forEach((o) => {
      const d   = new Date(o.createdAt);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      if (monthMap[key]) {
        monthMap[key].revenue += o.netAmount;
        monthMap[key].orders  += 1;
      }
    });

    const monthlyRevenue = Object.values(monthMap);

    // ── Product type breakdown ──────────────────────────────────────
    const productBreakdown: Record<string, { orders: number; revenue: number }> = {};
    orders.forEach((o) => {
      const pt = o.productType ?? "ANNUAL";
      if (!productBreakdown[pt]) productBreakdown[pt] = { orders: 0, revenue: 0 };
      productBreakdown[pt].orders  += 1;
      productBreakdown[pt].revenue += o.netAmount;
    });

    // ── Sales leaderboard ───────────────────────────────────────────
    const grouped: Record<string, { name: string; orders: number; revenue: number }> = {};
    orders.forEach((o) => {
      const id = o.createdById;
      if (!grouped[id]) grouped[id] = { name: o.createdBy.name, orders: 0, revenue: 0 };
      grouped[id].orders  += 1;
      grouped[id].revenue += o.netAmount;
    });
    const leaderboard = Object.values(grouped).sort((a, b) => b.revenue - a.revenue);

    // ── Top schools by revenue ──────────────────────────────────────
    const schoolRevenue: Record<string, { name: string; revenue: number; orders: number }> = {};
    orders.forEach((o) => {
      const id = o.schoolId;
      if (!schoolRevenue[id]) schoolRevenue[id] = { name: o.school.name, revenue: 0, orders: 0 };
      schoolRevenue[id].revenue += o.netAmount;
      schoolRevenue[id].orders  += 1;
    });
    const topSchools = Object.values(schoolRevenue)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    return NextResponse.json({
      totalOrders,
      totalRevenue,
      leaderboard,
      latestReports: reports,
      monthlyRevenue,
      pipelineBreakdown,
      productBreakdown,
      topSchools,
    });
  } catch (error) {
    console.error("Admin analytics error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}