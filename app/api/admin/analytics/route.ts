import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function parseJwt(token: string) {
  try {
    const base64Payload = token.split(".")[1];
    const payload = Buffer.from(base64Payload, "base64").toString();
    return JSON.parse(payload);
  } catch {
    return null;
  }
}

export async function GET(req: Request) {
  try {
    const token = req.headers.get("cookie")?.match(/token=([^;]+)/)?.[1];

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const decoded = parseJwt(token);

    if (!decoded || !decoded.roles?.includes("ADMIN")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const orders = await prisma.order.findMany({
      where: { status: "FINALIZED" },
      include: {
        createdBy: true,
        school: true,
      },
    });

    const reports = await prisma.dailyReport.findMany({
      include: { salesUser: true },
      orderBy: { createdAt: "desc" },
      take: 5,
    });

    const totalOrders = orders.length;

    const totalRevenue = orders.reduce(
      (sum, order) => sum + order.netAmount,
      0
    );

    const grouped: Record<
      string,
      { name: string; orders: number; revenue: number }
    > = {};

    orders.forEach((order) => {
      const creatorId = order.createdById;

      if (!grouped[creatorId]) {
        grouped[creatorId] = {
          name: order.createdBy.name,
          orders: 0,
          revenue: 0,
        };
      }

      grouped[creatorId].orders += 1;
      grouped[creatorId].revenue += order.netAmount;
    });

    const leaderboard = Object.values(grouped).sort(
      (a, b) => b.revenue - a.revenue
    );

    return NextResponse.json({
      totalOrders,
      totalRevenue,
      leaderboard,
      latestReports: reports,
    });
  } catch (error) {
    console.error("Analytics error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}