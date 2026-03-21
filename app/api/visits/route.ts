import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken, getTokenFromRequest } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const token = getTokenFromRequest(req);
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const decoded = verifyToken(token);
    if (!decoded) return NextResponse.json({ error: "Invalid token" }, { status: 401 });

    const { schoolId, outcome, notes, nextVisitDate } = await req.json();
    if (!schoolId) return NextResponse.json({ error: "schoolId is required" }, { status: 400 });

    const validOutcomes = ["INTERESTED", "FOLLOW_UP", "NOT_INTERESTED", "ORDER_PLACED"];
    if (outcome && !validOutcomes.includes(outcome)) {
      return NextResponse.json({ error: "Invalid outcome" }, { status: 400 });
    }

    const visit = await prisma.visit.create({
      data: {
        schoolId,
        salesUserId:   decoded.userId,
        outcome:       outcome       ?? null,
        notes:         notes         ?? null,
        nextVisitDate: nextVisitDate ? new Date(nextVisitDate) : null,
      } as any,
      include: {
        school:    { select: { id: true, name: true } },
        salesUser: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json(visit, { status: 201 });
  } catch (err) {
    console.error("Visits POST error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const token = getTokenFromRequest(req);
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const decoded = verifyToken(token);
    if (!decoded) return NextResponse.json({ error: "Invalid token" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const schoolId = searchParams.get("schoolId");

    let where: any = {};
    if (schoolId) where.schoolId = schoolId;

    if (decoded.roles.includes("SALES")) {
      where.salesUserId = decoded.userId;
    } else if (decoded.roles.includes("BD_HEAD")) {
      const team = await prisma.user.findMany({ where: { managerId: decoded.userId }, select: { id: true } });
      where.salesUserId = { in: [decoded.userId, ...team.map((u) => u.id)] };
    }

    const visits = await prisma.visit.findMany({
      where,
      include: {
        school:    { select: { id: true, name: true } },
        salesUser: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    return NextResponse.json(visits);
  } catch (err) {
    console.error("Visits GET error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
