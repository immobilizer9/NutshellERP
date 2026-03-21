import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken, getTokenFromRequest } from "@/lib/auth";

// GET /api/targets — list targets
// BD_HEAD: sees all their team's targets (and their own)
// SALES: sees only their own targets
// ADMIN: sees everyone's targets
export async function GET(req: Request) {
  try {
    const token = getTokenFromRequest(req);
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const decoded = verifyToken(token);
    if (!decoded) return NextResponse.json({ error: "Invalid token" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const monthParam = searchParams.get("month");
    const yearParam  = searchParams.get("year");
    const userIdParam = searchParams.get("userId");

    let where: any = {};

    if (monthParam) where.month = parseInt(monthParam);
    if (yearParam)  where.year  = parseInt(yearParam);

    if (decoded.roles.includes("SALES")) {
      where.userId = decoded.userId;
    } else if (decoded.roles.includes("BD_HEAD")) {
      const team = await prisma.user.findMany({
        where: { managerId: decoded.userId },
        select: { id: true },
      });
      const teamIds = [decoded.userId, ...team.map((u) => u.id)];
      if (userIdParam && teamIds.includes(userIdParam)) {
        where.userId = userIdParam;
      } else {
        where.userId = { in: teamIds };
      }
    } else if (decoded.roles.includes("ADMIN")) {
      if (userIdParam) where.userId = userIdParam;
    }

    const targets = await (prisma as any).target.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
      orderBy: [{ year: "desc" }, { month: "desc" }],
    }) as any[];

    return NextResponse.json(targets);
  } catch (err) {
    console.error("Targets GET error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/targets — create or update a target (BD_HEAD / ADMIN only)
// Body: { userId, month, year, revenueTarget, ordersTarget }
export async function POST(req: Request) {
  try {
    const token = getTokenFromRequest(req);
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const decoded = verifyToken(token);
    if (!decoded) return NextResponse.json({ error: "Invalid token" }, { status: 401 });

    const isBD    = decoded.roles.includes("BD_HEAD");
    const isAdmin = decoded.roles.includes("ADMIN");
    if (!isBD && !isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { userId, month, year, revenueTarget, ordersTarget } = await req.json();

    if (!userId || !month || !year) {
      return NextResponse.json({ error: "userId, month, year are required" }, { status: 400 });
    }

    // BD_HEAD can only set targets for their own team
    if (isBD && !isAdmin) {
      const team = await prisma.user.findMany({
        where: { managerId: decoded.userId },
        select: { id: true },
      });
      const teamIds = [decoded.userId, ...team.map((u) => u.id)];
      if (!teamIds.includes(userId)) {
        return NextResponse.json({ error: "Cannot set targets for users outside your team" }, { status: 403 });
      }
    }

    const targetUser = await prisma.user.findUnique({ where: { id: userId } });
    if (!targetUser) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const target = await (prisma as any).target.upsert({
      where: { userId_month_year: { userId, month: parseInt(month), year: parseInt(year) } },
      update: {
        revenueTarget: parseFloat(revenueTarget) || 0,
        ordersTarget:  parseInt(ordersTarget)    || 0,
      },
      create: {
        userId,
        organizationId: targetUser.organizationId,
        month:  parseInt(month),
        year:   parseInt(year),
        revenueTarget: parseFloat(revenueTarget) || 0,
        ordersTarget:  parseInt(ordersTarget)    || 0,
      },
    }) as any;

    return NextResponse.json(target, { status: 201 });
  } catch (err) {
    console.error("Targets POST error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
