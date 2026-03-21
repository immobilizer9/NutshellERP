import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken, getTokenFromRequest } from "@/lib/auth";

export async function GET(req: Request) {
  try {
    const token = getTokenFromRequest(req);
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const decoded = verifyToken(token);
    if (!decoded) return NextResponse.json({ error: "Invalid token" }, { status: 401 });

    // Any authenticated user can view their own analytics
    const userId = decoded.userId;

    // ── Orders ──────────────────────────────────────────────────
    const orders = await prisma.order.findMany({
      where: { createdById: userId },
      include: { school: { select: { name: true } } },
      orderBy: { createdAt: "asc" },
    });

    const totalOrders    = orders.length;
    const approvedOrders = orders.filter((o) => o.status === "APPROVED");
    const pendingOrders  = orders.filter((o) => o.status === "PENDING");
    const rejectedOrders = orders.filter((o) => o.status === "REJECTED");
    const totalRevenue   = approvedOrders.reduce((s, o) => s + o.netAmount, 0);
    const totalGross     = approvedOrders.reduce((s, o) => s + o.grossAmount, 0);
    const totalReturns   = totalGross - totalRevenue;

    // ── Monthly revenue (last 12 months) ────────────────────────
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 11);
    twelveMonthsAgo.setDate(1);
    twelveMonthsAgo.setHours(0, 0, 0, 0);

    const monthMap: Record<string, { label: string; revenue: number; orders: number }> = {};
    for (let i = 0; i < 12; i++) {
      const d = new Date();
      d.setMonth(d.getMonth() - (11 - i));
      const key   = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const label = d.toLocaleDateString("en-IN", { month: "short", year: "2-digit" });
      monthMap[key] = { label, revenue: 0, orders: 0 };
    }

    approvedOrders.forEach((o) => {
      const d   = new Date(o.createdAt);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      if (monthMap[key]) {
        monthMap[key].revenue += o.netAmount;
        monthMap[key].orders  += 1;
      }
    });

    const monthlyRevenue = Object.values(monthMap);

    // ── Product type breakdown ───────────────────────────────────
    const productBreakdown: Record<string, { orders: number; revenue: number }> = {};
    approvedOrders.forEach((o) => {
      const pt = o.productType ?? "ANNUAL";
      if (!productBreakdown[pt]) productBreakdown[pt] = { orders: 0, revenue: 0 };
      productBreakdown[pt].orders  += 1;
      productBreakdown[pt].revenue += o.netAmount;
    });

    // ── Top schools by revenue ───────────────────────────────────
    const schoolRevenue: Record<string, { name: string; revenue: number; orders: number }> = {};
    approvedOrders.forEach((o) => {
      const id = o.schoolId;
      if (!schoolRevenue[id]) schoolRevenue[id] = { name: o.school.name, revenue: 0, orders: 0 };
      schoolRevenue[id].revenue += o.netAmount;
      schoolRevenue[id].orders  += 1;
    });
    const topSchools = Object.values(schoolRevenue)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 8);

    // ── Tasks ────────────────────────────────────────────────────
    const tasks = await prisma.task.findMany({
      where: { assignedToId: userId },
      orderBy: { dueDate: "asc" },
    });

    const now = new Date();
    const totalTasks     = tasks.length;
    const completedTasks = tasks.filter((t) => t.status === "COMPLETED").length;
    const pendingTasks   = tasks.filter((t) => t.status === "PENDING").length;
    const overdueTasks   = tasks.filter((t) => t.status !== "COMPLETED" && new Date(t.dueDate) < now).length;
    const completionRate = totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);

    // ── Daily reports ────────────────────────────────────────────
    const reports = await prisma.dailyReport.findMany({
      where: { salesUserId: userId },
      orderBy: { createdAt: "desc" },
      take: 30,
    });

    const totalReports    = reports.length;
    const approvedReports = reports.filter((r) => r.status === "APPROVED").length;

    // ── Pipeline ─────────────────────────────────────────────────
    const schools = await prisma.school.findMany({
      where: { assignedToId: userId },
      select: { pipelineStage: true },
    });

    const pipelineBreakdown: Record<string, number> = {};
    schools.forEach((s) => {
      pipelineBreakdown[s.pipelineStage] = (pipelineBreakdown[s.pipelineStage] ?? 0) + 1;
    });

    const closedWon  = pipelineBreakdown["CLOSED_WON"]  ?? 0;
    const closedLost = pipelineBreakdown["CLOSED_LOST"] ?? 0;
    const totalClosed = closedWon + closedLost;
    const conversionRate = totalClosed === 0 ? 0 : Math.round((closedWon / totalClosed) * 100);

    return NextResponse.json({
      // Orders
      totalOrders,
      approvedOrders:  approvedOrders.length,
      pendingOrders:   pendingOrders.length,
      rejectedOrders:  rejectedOrders.length,
      totalRevenue,
      totalGross,
      totalReturns,
      monthlyRevenue,
      productBreakdown,
      topSchools,

      // Tasks
      totalTasks,
      completedTasks,
      pendingTasks,
      overdueTasks,
      completionRate,

      // Reports
      totalReports,
      approvedReports,

      // Pipeline
      pipelineBreakdown,
      totalSchools: schools.length,
      conversionRate,
    });
  } catch (error) {
    console.error("Sales analytics error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}