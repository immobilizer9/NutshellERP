import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken, getTokenFromRequest, hasModule } from "@/lib/auth";

// GET /api/analytics/engagement-conversion
// Compares conversion rate, avg order value, and avg order count
// between schools with at least one completed quiz/training vs those without.
export async function GET(req: Request) {
  try {
    const token = getTokenFromRequest(req);
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const decoded = verifyToken(token);
    if (!decoded || !hasModule(decoded, "ANALYTICS")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Scoping: SALES sees only own schools, BD sees team, Admin sees all
    let schoolWhere: any = { deletedAt: null };
    if (hasModule(decoded, "ORDERS") && !hasModule(decoded, "TEAM_MANAGEMENT") && !hasModule(decoded, "USER_MANAGEMENT")) {
      schoolWhere.assignedToId = decoded.userId;
    } else if (hasModule(decoded, "TEAM_MANAGEMENT") && !hasModule(decoded, "USER_MANAGEMENT")) {
      const team = await prisma.user.findMany({
        where: { managerId: decoded.userId },
        select: { id: true },
      });
      schoolWhere.assignedToId = { in: [decoded.userId, ...team.map((u) => u.id)] };
    }

    // Pull all schools with their orders, quiz sessions, and training sessions
    const schools = await prisma.school.findMany({
      where: schoolWhere,
      select: {
        id: true,
        name: true,
        orders: {
          where: { status: "APPROVED", deletedAt: null },
          select: { id: true, netAmount: true, createdAt: true },
        },
        quizSessions: {
          where: { status: "COMPLETED" },
          select: { id: true, completedDate: true },
        },
        trainingSessions: {
          where: { status: "COMPLETED" },
          select: { id: true, completedDate: true },
        },
      },
    });

    // Split into engaged vs non-engaged
    const engaged:    typeof schools = [];
    const nonEngaged: typeof schools = [];

    for (const school of schools) {
      const hasEngagement = school.quizSessions.length > 0 || school.trainingSessions.length > 0;
      if (hasEngagement) engaged.push(school);
      else               nonEngaged.push(school);
    }

    function computeStats(group: typeof schools) {
      const total = group.length;
      if (total === 0) return { total, converted: 0, conversionRate: 0, avgOrderValue: 0, avgOrderCount: 0, totalRevenue: 0 };

      const converted = group.filter((s) => s.orders.length > 0).length;
      const allOrders = group.flatMap((s) => s.orders);
      const totalRevenue = allOrders.reduce((sum, o) => sum + o.netAmount, 0);

      return {
        total,
        converted,
        conversionRate: Math.round((converted / total) * 100),
        avgOrderValue:  converted > 0 ? Math.round(totalRevenue / converted) : 0,
        avgOrderCount:  converted > 0 ? +(allOrders.length / converted).toFixed(1) : 0,
        totalRevenue:   Math.round(totalRevenue),
      };
    }

    const engagedStats    = computeStats(engaged);
    const nonEngagedStats = computeStats(nonEngaged);

    // Monthly comparison: orders from engaged vs non-engaged schools (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1);
    sixMonthsAgo.setHours(0, 0, 0, 0);

    const engagedIds    = new Set(engaged.map((s) => s.id));
    const nonEngagedIds = new Set(nonEngaged.map((s) => s.id));

    const recentOrders = await prisma.order.findMany({
      where: {
        status:    "APPROVED",
        deletedAt: null,
        createdAt: { gte: sixMonthsAgo },
        schoolId:  { in: [...engagedIds, ...nonEngagedIds] },
      },
      select: { schoolId: true, netAmount: true, createdAt: true },
    });

    // Build month buckets for chart
    const monthBuckets: Record<string, { label: string; engaged: number; nonEngaged: number }> = {};
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const label = d.toLocaleString("en-IN", { month: "short", year: "2-digit" });
      monthBuckets[key] = { label, engaged: 0, nonEngaged: 0 };
    }

    for (const o of recentOrders) {
      const d   = new Date(o.createdAt);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      if (!monthBuckets[key]) continue;
      if (engagedIds.has(o.schoolId))    monthBuckets[key].engaged    += o.netAmount;
      else if (nonEngagedIds.has(o.schoolId)) monthBuckets[key].nonEngaged += o.netAmount;
    }

    const monthlyComparison = Object.values(monthBuckets);

    // ROI statement
    const convDiff = engagedStats.conversionRate - nonEngagedStats.conversionRate;

    return NextResponse.json({
      engaged:           engagedStats,
      nonEngaged:        nonEngagedStats,
      monthlyComparison,
      conversionLift:    convDiff,
      totalSchools:      schools.length,
    });
  } catch (err) {
    console.error("Engagement conversion error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
