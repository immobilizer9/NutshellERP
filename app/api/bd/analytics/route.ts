import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken, getTokenFromRequest } from "@/lib/auth";

export async function GET(req: Request) {
  try {
    const token = getTokenFromRequest(req);
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const decoded = verifyToken(token);
    if (!decoded || !decoded.roles.includes("BD_HEAD")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // ── Team ──────────────────────────────────────────────────────
    const team = await prisma.user.findMany({
      where:  { managerId: decoded.userId },
      select: { id: true, name: true },
    });
    const teamIds = team.map((u) => u.id);

    // ── Orders ────────────────────────────────────────────────────
    const orders = await prisma.order.findMany({
      where:   { createdById: { in: teamIds } },
      include: {
        school:    { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "asc" },
    });

    const approvedOrders = orders.filter((o) => o.status === "APPROVED");
    const totalOrders    = orders.length;
    const totalRevenue   = approvedOrders.reduce((s, o) => s + o.netAmount, 0);
    const totalGross     = approvedOrders.reduce((s, o) => s + o.grossAmount, 0);
    const pendingCount   = orders.filter((o) => o.status === "PENDING").length;
    const rejectedCount  = orders.filter((o) => o.status === "REJECTED").length;

    // ── Monthly revenue (last 12 months) ─────────────────────────
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
      if (monthMap[key]) { monthMap[key].revenue += o.netAmount; monthMap[key].orders += 1; }
    });
    const monthlyRevenue = Object.values(monthMap);

    // ── Product breakdown ─────────────────────────────────────────
    const productBreakdown: Record<string, { orders: number; revenue: number }> = {};
    approvedOrders.forEach((o) => {
      const pt = o.productType ?? "ANNUAL";
      if (!productBreakdown[pt]) productBreakdown[pt] = { orders: 0, revenue: 0 };
      productBreakdown[pt].orders  += 1;
      productBreakdown[pt].revenue += o.netAmount;
    });

    // ── Top schools ───────────────────────────────────────────────
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

    // ── Pipeline breakdown ────────────────────────────────────────
    const schools = await prisma.school.findMany({
      where:  { assignedToId: { in: teamIds } },
      select: { pipelineStage: true },
    });
    const stageCounts: Record<string, number> = {};
    schools.forEach((s) => { stageCounts[s.pipelineStage] = (stageCounts[s.pipelineStage] ?? 0) + 1; });
    const pipelineBreakdown = Object.entries(stageCounts).map(([stage, count]) => ({ stage, count }));

    // ── Tasks ─────────────────────────────────────────────────────
    const tasks = await prisma.task.findMany({
      where:   { assignedToId: { in: teamIds } },
      include: { assignedTo: { select: { id: true, name: true } } },
      orderBy: { dueDate: "asc" },
    });
    const now = new Date();
    const totalTasks     = tasks.length;
    const completedTasks = tasks.filter((t) => t.status === "COMPLETED").length;
    const pendingTasks   = tasks.filter((t) => t.status === "PENDING").length;
    const overdueTasks   = tasks.filter((t) => t.status !== "COMPLETED" && new Date(t.dueDate) < now).length;
    const completionRate = totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);

    // ── Sales activity status ─────────────────────────────────────
    const reports = await prisma.dailyReport.findMany({
      where:   { salesUserId: { in: teamIds } },
      orderBy: { createdAt: "desc" },
      include: { salesUser: { select: { id: true, name: true } } },
    });
    // Per-rep current-month revenue (for incentive tracker)
    const currentMonth = now.getMonth();
    const currentYear  = now.getFullYear();
    const salesActivityStatus = team.map((user) => {
      const latest     = reports.find((r) => r.salesUserId === user.id);
      const lastActivity = latest?.createdAt ?? null;
      const isInactive   = !lastActivity || Date.now() - new Date(lastActivity).getTime() > 24 * 60 * 60 * 1000;
      const monthRevenue = approvedOrders
        .filter((o) => {
          const d = new Date(o.createdAt);
          return o.createdById === user.id && d.getMonth() === currentMonth && d.getFullYear() === currentYear;
        })
        .reduce((s, o) => s + o.netAmount, 0);
      return { userId: user.id, name: user.name, lastActivity, isInactive, monthRevenue };
    });

    return NextResponse.json({
      // Orders — same shape as admin + sales analytics
      totalOrders,
      approvedOrders: approvedOrders.length,
      pendingOrders:  pendingCount,
      rejectedOrders: rejectedCount,
      totalRevenue,
      totalGross,
      totalReturns: totalGross - totalRevenue,
      monthlyRevenue,
      productBreakdown,
      topSchools,

      // Pipeline
      pipelineBreakdown,
      totalSchools: schools.length,

      // Tasks
      totalTasks,
      completedTasks,
      pendingTasks,
      overdueTasks,
      completionRate,

      // Team activity
      salesActivityStatus,
    });
  } catch (error) {
    console.error("BD analytics error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}