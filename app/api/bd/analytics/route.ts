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
    if (!decoded || (!isAdmin && !isBdHead)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // ── Team ──────────────────────────────────────────────────────
    // Admin sees all sales users org-wide; BD head sees their direct reports
    const team = isAdmin
      ? await prisma.user.findMany({
          where: {
            organizationId: decoded.organizationId,
            roles: { some: { role: { name: "SALES" } } },
          },
          select: { id: true, name: true },
        })
      : await prisma.user.findMany({
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

    const approvedOrders  = orders.filter((o) => o.status === "APPROVED");
    const pendingOrdersList = orders.filter((o) => o.status === "PENDING");
    const totalOrders     = orders.length;
    const totalRevenue    = approvedOrders.reduce((s, o) => s + o.netAmount, 0);
    const totalGross      = approvedOrders.reduce((s, o) => s + o.grossAmount, 0);
    const pendingCount    = pendingOrdersList.length;
    const rejectedCount   = orders.filter((o) => o.status === "REJECTED").length;

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

    // ── Pipeline breakdown + forecast ─────────────────────────────
    const STAGE_WEIGHTS: Record<string, number> = {
      LEAD: 0.05, CONTACTED: 0.15, VISITED: 0.30,
      PROPOSAL_SENT: 0.50, NEGOTIATION: 0.70, CLOSED_WON: 1.0, CLOSED_LOST: 0,
    };
    const schools = await prisma.school.findMany({
      where:  { assignedToId: { in: teamIds } },
      select: { pipelineStage: true },
    });
    const stageCounts: Record<string, number> = {};
    schools.forEach((s) => { stageCounts[s.pipelineStage] = (stageCounts[s.pipelineStage] ?? 0) + 1; });
    const pipelineBreakdown = Object.entries(stageCounts).map(([stage, count]) => ({ stage, count }));
    // Weighted forecast: avg approved order value × stage probability × school count
    const avgOrderValue = approvedOrders.length > 0 ? totalRevenue / approvedOrders.length : 0;
    const forecastRevenue = Math.round(
      Object.entries(stageCounts).reduce((sum, [stage, count]) => {
        return sum + count * (STAGE_WEIGHTS[stage] ?? 0) * avgOrderValue;
      }, 0)
    );

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

    // ── Visit analytics ───────────────────────────────────────────
    const visits = await prisma.visit.findMany({
      where: { salesUserId: { in: teamIds } },
      select: { outcome: true, createdAt: true },
    });
    const visitOutcomes: Record<string, number> = {};
    visits.forEach((v) => {
      const k = v.outcome ?? "NO_OUTCOME";
      visitOutcomes[k] = (visitOutcomes[k] ?? 0) + 1;
    });
    const totalVisits = visits.length;

    // ── Sales activity status ─────────────────────────────────────
    const reports = await prisma.dailyReport.findMany({
      where:   { salesUserId: { in: teamIds } },
      orderBy: { createdAt: "desc" },
      include: { salesUser: { select: { id: true, name: true } } },
    });

    // ── Visits this month per rep ─────────────────────────────────
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const visitsThisMonthRaw = await prisma.visit.findMany({
      where:  { salesUserId: { in: teamIds }, createdAt: { gte: monthStart } },
      select: { salesUserId: true },
    });
    const visitCountByRep: Record<string, number> = {};
    for (const v of visitsThisMonthRaw) visitCountByRep[v.salesUserId] = (visitCountByRep[v.salesUserId] ?? 0) + 1;

    // ── Report submitted today per rep ───────────────────────────
    const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0);
    const reportedToday = new Set(
      reports.filter((r) => new Date(r.createdAt) >= todayStart).map((r) => r.salesUserId)
    );
    const reportTodayCount = reportedToday.size;
    const reportTodayTotal = teamIds.length;

    // ── Team targets this month ───────────────────────────────────
    const currentMonth = now.getMonth();
    const currentYear  = now.getFullYear();
    const targets = await prisma.target.findMany({
      where: { userId: { in: teamIds }, month: currentMonth + 1, year: currentYear },
    });
    const targetByRep: Record<string, any> = {};
    for (const t of targets) targetByRep[t.userId] = t;

    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const daysLeft    = daysInMonth - now.getDate();

    const salesActivityStatus = team.map((user) => {
      const latest       = reports.find((r) => r.salesUserId === user.id);
      const lastActivity = latest?.createdAt ?? null;
      const isInactive   = !lastActivity || Date.now() - new Date(lastActivity).getTime() > 24 * 60 * 60 * 1000;
      const monthRevenue = approvedOrders
        .filter((o) => {
          const d = new Date(o.createdAt);
          return o.createdById === user.id && d.getMonth() === currentMonth && d.getFullYear() === currentYear;
        })
        .reduce((s, o) => s + o.netAmount, 0);
      const target     = targetByRep[user.id];
      const targetRev  = target?.revenueTarget ?? 0;
      const pct        = targetRev > 0 ? Math.round((monthRevenue / targetRev) * 100) : null;
      const atRisk     = targetRev > 0 && pct !== null && pct < 50 && daysLeft <= 10;
      return {
        userId: user.id, name: user.name, lastActivity, isInactive, monthRevenue,
        targetRevenue: targetRev, achievementPct: pct, atRisk,
        visitsThisMonth: visitCountByRep[user.id] ?? 0,
        reportedToday:   reportedToday.has(user.id),
      };
    });

    const atRiskReps = salesActivityStatus.filter((s) => s.atRisk);

    // ── Activity timeline ─────────────────────────────────────────
    const recentOrders = orders.slice(-20);
    const recentTasks  = tasks.slice(0, 20);
    const timeline = [
      ...reports.slice(0, 20).map((r) => ({
        type:        "REPORT" as const,
        user:        r.salesUser.name,
        description: r.summary.slice(0, 100),
        time:        r.createdAt.toISOString(),
      })),
      ...recentOrders.map((o) => ({
        type:        "ORDER" as const,
        user:        o.createdBy.name,
        description: `Order for ${o.school.name} — ₹${o.netAmount.toLocaleString()}`,
        time:        o.createdAt.toISOString(),
      })),
      ...recentTasks.map((t) => ({
        type:        "TASK" as const,
        user:        t.assignedTo.name,
        description: t.title,
        time:        t.createdAt.toISOString(),
      })),
    ]
      .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
      .slice(0, 20);

    return NextResponse.json({
      // Orders — same shape as admin + sales analytics
      totalOrders,
      approvedOrders: approvedOrders.length,
      pendingOrders:  pendingOrdersList,
      rejectedOrders: rejectedCount,
      totalRevenue,
      totalGross,
      totalReturns: totalGross - totalRevenue,
      monthlyRevenue,
      productBreakdown,
      topSchools,

      // Pipeline + forecast
      pipelineBreakdown,
      totalSchools: schools.length,
      forecastRevenue,

      // Visits
      totalVisits,
      visitOutcomes,

      // Tasks
      totalTasks,
      completedTasks,
      pendingTasks,
      overdueTasks,
      completionRate,

      // Team activity
      salesActivityStatus,

      // Activity timeline (combined reports + orders + tasks)
      timeline,

      // Daily report coverage today
      reportTodayCount,
      reportTodayTotal,

      // At-risk reps
      atRiskReps,

      // Daily reports (for team review)
      recentReports: reports.slice(0, 50),
    });
  } catch (error) {
    console.error("BD analytics error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}