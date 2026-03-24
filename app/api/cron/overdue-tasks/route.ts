import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/cron/overdue-tasks
 *
 * Creates OVERDUE_TASK notifications for any incomplete task past its due date
 * where a notification has not already been sent today.
 *
 * Intended to be called by an external cron scheduler (e.g. cron-job.org, GitHub Actions,
 * Vercel Cron) once per day. Protect with the CRON_SECRET environment variable.
 *
 * Example cron invocation:
 *   curl -X POST https://your-domain.com/api/cron/overdue-tasks \
 *        -H "Authorization: Bearer $CRON_SECRET"
 */
export async function POST(req: Request) {
  const auth = req.headers.get("authorization");
  const expected = process.env.CRON_SECRET;

  if (!expected || auth !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const now = new Date();

    // Find tasks that are overdue and still not completed
    const overdueTasks = await prisma.task.findMany({
      where: {
        status:  { not: "COMPLETED" },
        dueDate: { lt: now },
      },
      include: {
        assignedTo: { select: { id: true, organizationId: true } },
      },
    });

    if (overdueTasks.length === 0) {
      return NextResponse.json({ notified: 0, message: "No overdue tasks" });
    }

    // Check which ones already have an OVERDUE_TASK notification sent today
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);

    const existing = await (prisma as any).notification.findMany({
      where: {
        type:      "OVERDUE_TASK",
        entityType: "Task",
        entityId:  { in: overdueTasks.map((t) => t.id) },
        createdAt: { gte: todayStart },
      },
      select: { entityId: true },
    });

    const alreadyNotified = new Set(existing.map((n: any) => n.entityId));

    const toNotify = overdueTasks.filter((t) => !alreadyNotified.has(t.id));

    if (toNotify.length === 0) {
      return NextResponse.json({ notified: 0, message: "All overdue tasks already notified today" });
    }

    await (prisma as any).notification.createMany({
      data: toNotify.map((task) => ({
        userId:         task.assignedToId,
        organizationId: task.assignedTo.organizationId,
        type:           "OVERDUE_TASK",
        title:          "Task Overdue",
        message:        `"${task.title}" was due on ${task.dueDate.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}`,
        entityType:     "Task",
        entityId:       task.id,
      })),
    });

    return NextResponse.json({ notified: toNotify.length });
  } catch (error) {
    console.error("Overdue tasks cron error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
