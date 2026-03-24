import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import fs from "fs";
import path from "path";

const SETTINGS_PATH = path.join(process.cwd(), "config", "settings.json");

function getDeliveryThresholdDays(): number {
  try {
    if (fs.existsSync(SETTINGS_PATH)) {
      const s = JSON.parse(fs.readFileSync(SETTINGS_PATH, "utf-8"));
      if (s.deliveryAlertDays) return Number(s.deliveryAlertDays);
    }
  } catch { /* ignore */ }
  return 7;
}

/**
 * POST /api/cron/delivery-alerts
 *
 * Creates DELIVERY_ALERT notifications for sales reps whose approved orders
 * have a deliveryDate within the configured horizon (default 7 days) and are
 * not yet delivered. Deduplicates: one notification per order per day.
 *
 * Intended to be called once per day by an external scheduler.
 * Protected by CRON_SECRET bearer token.
 *
 * Example:
 *   curl -X POST https://your-domain.com/api/cron/delivery-alerts \
 *        -H "Authorization: Bearer $CRON_SECRET"
 */
export async function POST(req: Request) {
  const auth     = req.headers.get("authorization");
  const expected = process.env.CRON_SECRET;

  if (!expected || auth !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const horizonDays = getDeliveryThresholdDays();
    const now    = new Date();
    const future = new Date();
    future.setDate(future.getDate() + horizonDays);

    const orders = await prisma.order.findMany({
      where: {
        status:         "APPROVED",
        deliveryStatus: { not: "DELIVERED" },
        deliveryDate:   { not: null, lte: future },
      },
      include: {
        school:    { select: { name: true } },
        createdBy: { select: { id: true, organizationId: true } },
      },
    });

    if (orders.length === 0) {
      return NextResponse.json({ notified: 0, message: "No upcoming deliveries" });
    }

    // Dedup: skip if already notified about this order today
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const existing = await (prisma as any).notification.findMany({
      where: {
        type:       "DELIVERY_ALERT",
        entityType: "Order",
        entityId:   { in: orders.map((o) => o.id) },
        createdAt:  { gte: todayStart },
      },
      select: { entityId: true },
    });

    const alreadyNotified = new Set(existing.map((n: any) => n.entityId));
    const toNotify = orders.filter((o) => !alreadyNotified.has(o.id));

    if (toNotify.length === 0) {
      return NextResponse.json({ notified: 0, message: "All delivery alerts already sent today" });
    }

    await (prisma as any).notification.createMany({
      data: toNotify.map((order) => {
        const dueDate  = new Date(order.deliveryDate!);
        const daysLeft = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        const urgency  = daysLeft <= 0 ? "overdue" : daysLeft === 1 ? "due tomorrow" : `due in ${daysLeft} days`;
        return {
          userId:         order.createdById,
          organizationId: order.createdBy.organizationId,
          type:           "DELIVERY_ALERT",
          title:          "Delivery Due Soon",
          message:        `Order for ${order.school.name} is ${urgency} (${dueDate.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })})`,
          entityType:     "Order",
          entityId:       order.id,
        };
      }),
    });

    return NextResponse.json({ notified: toNotify.length });
  } catch (error) {
    console.error("Delivery alerts cron error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
