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

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo  = new Date(now.getTime() - 7  * 24 * 60 * 60 * 1000);

    const [
      totalUsers, activeUsers,
      totalSchools, totalOrders,
      totalTasks, completedTasks, overdueTasks,
      totalVisits, recentVisits,
      totalReports, recentReports,
      approvedOrders, pendingOrders, rejectedOrders,
      recentOrders,
      auditLogs,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { isActive: true } }),
      prisma.school.count(),
      prisma.order.count(),
      prisma.task.count(),
      prisma.task.count({ where: { status: "COMPLETED" } }),
      prisma.task.count({ where: { status: { not: "COMPLETED" }, dueDate: { lt: now } } }),
      prisma.visit.count(),
      prisma.visit.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
      prisma.dailyReport.count(),
      prisma.dailyReport.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
      prisma.order.count({ where: { status: "APPROVED" } }),
      prisma.order.count({ where: { status: "PENDING" } }),
      prisma.order.count({ where: { status: "REJECTED" } }),
      prisma.order.findMany({
        where:   { createdAt: { gte: thirtyDaysAgo } },
        select:  { netAmount: true, status: true, createdAt: true },
        orderBy: { createdAt: "asc" },
      }),
      prisma.auditLog.findMany({
        orderBy: { createdAt: "desc" },
        take: 10,
        select: { action: true, entity: true, userName: true, createdAt: true },
      }),
    ]);

    // Revenue totals
    const allApproved = await prisma.order.findMany({
      where:  { status: "APPROVED" },
      select: { netAmount: true, grossAmount: true, createdAt: true },
    });
    const totalRevenue   = allApproved.reduce((s, o) => s + o.netAmount, 0);
    const totalGross     = allApproved.reduce((s, o) => s + o.grossAmount, 0);
    const recentRevenue  = allApproved
      .filter((o) => new Date(o.createdAt) >= thirtyDaysAgo)
      .reduce((s, o) => s + o.netAmount, 0);

    // Users by role
    const userRoles = await prisma.userRole.findMany({
      include: { role: { select: { name: true } } },
    });
    const roleCount: Record<string, number> = {};
    userRoles.forEach((ur) => { roleCount[ur.role.name] = (roleCount[ur.role.name] ?? 0) + 1; });

    // Pipeline stage counts
    const schoolStages = await prisma.school.findMany({ select: { pipelineStage: true } });
    const stageCount: Record<string, number> = {};
    schoolStages.forEach((s) => { stageCount[s.pipelineStage] = (stageCount[s.pipelineStage] ?? 0) + 1; });

    // Task completion rate
    const completionRate = totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);

    return NextResponse.json({
      // Users
      totalUsers, activeUsers,
      roleCount,

      // Schools + pipeline
      totalSchools,
      stageCount,

      // Orders + revenue
      totalOrders, approvedOrders, pendingOrders, rejectedOrders,
      totalRevenue, totalGross,
      totalReturns: totalGross - totalRevenue,
      recentRevenue,
      avgOrderValue: approvedOrders > 0 ? Math.round(totalRevenue / approvedOrders) : 0,

      // Tasks
      totalTasks, completedTasks, overdueTasks, completionRate,

      // Field activity
      totalVisits, recentVisits,
      totalReports, recentReports,

      // Recent audit
      recentAudit: auditLogs,
    });
  } catch (error) {
    console.error("Metrics error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
