import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import fs from "fs";
import path from "path";

const SETTINGS_PATH = path.join(process.cwd(), "config", "settings.json");

function getVisitThresholdDays(): number {
  try {
    if (fs.existsSync(SETTINGS_PATH)) {
      const s = JSON.parse(fs.readFileSync(SETTINGS_PATH, "utf-8"));
      if (s.visitAlertDays) return Number(s.visitAlertDays);
    }
  } catch { /* ignore */ }
  return 30;
}

/**
 * POST /api/cron/visit-alerts
 *
 * Creates VISIT_ALERT notifications for sales reps whose assigned schools
 * have not been visited within the configured threshold (default 30 days).
 * Deduplicates: one notification per school per day.
 *
 * Intended to be called once per day by an external scheduler.
 * Protected by CRON_SECRET bearer token.
 *
 * Example:
 *   curl -X POST https://your-domain.com/api/cron/visit-alerts \
 *        -H "Authorization: Bearer $CRON_SECRET"
 */
export async function POST(req: Request) {
  const auth     = req.headers.get("authorization");
  const expected = process.env.CRON_SECRET;

  if (!expected || auth !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const thresholdDays = getVisitThresholdDays();
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - thresholdDays);

    // Find all schools with an assigned rep whose last visit is before the cutoff
    const schools = await prisma.school.findMany({
      where:   { assignedToId: { not: null } },
      include: {
        visits:     { orderBy: { createdAt: "desc" }, take: 1 },
        assignedTo: { select: { id: true, name: true, organizationId: true } },
      },
    });

    const overdue = schools.filter((s) => {
      const lastVisit = s.visits[0]?.createdAt ?? null;
      return !lastVisit || lastVisit < cutoff;
    });

    if (overdue.length === 0) {
      return NextResponse.json({ notified: 0, message: "No overdue school visits" });
    }

    // Dedup: skip if already notified about this school today
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const existing = await (prisma as any).notification.findMany({
      where: {
        type:       "VISIT_ALERT",
        entityType: "School",
        entityId:   { in: overdue.map((s) => s.id) },
        createdAt:  { gte: todayStart },
      },
      select: { entityId: true },
    });

    const alreadyNotified = new Set(existing.map((n: any) => n.entityId));
    const toNotify = overdue.filter((s) => !alreadyNotified.has(s.id));

    if (toNotify.length === 0) {
      return NextResponse.json({ notified: 0, message: "All overdue visits already notified today" });
    }

    await (prisma as any).notification.createMany({
      data: toNotify.map((school) => {
        const lastVisit = school.visits[0]?.createdAt ?? null;
        const daysAgo = lastVisit
          ? Math.floor((Date.now() - new Date(lastVisit).getTime()) / (1000 * 60 * 60 * 24))
          : null;
        const message = lastVisit
          ? `${school.name} was last visited ${daysAgo} day${daysAgo === 1 ? "" : "s"} ago (threshold: ${thresholdDays} days)`
          : `${school.name} has never been visited`;
        return {
          userId:         school.assignedToId!,
          organizationId: school.assignedTo!.organizationId,
          type:           "VISIT_ALERT",
          title:          "School Visit Overdue",
          message,
          entityType:     "School",
          entityId:       school.id,
        };
      }),
    });

    return NextResponse.json({ notified: toNotify.length });
  } catch (error) {
    console.error("Visit alerts cron error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
