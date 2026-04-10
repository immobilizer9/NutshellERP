import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken, getTokenFromRequest, hasModule } from "@/lib/auth";

export async function GET(req: Request) {
  try {
    const token = getTokenFromRequest(req);
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const decoded = verifyToken(token);
    if (!decoded) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const year  = Number(searchParams.get("year")  ?? new Date().getFullYear());
    const month = Number(searchParams.get("month") ?? (new Date().getMonth() + 1));

    const isAdmin  = hasModule(decoded, "USER_MANAGEMENT");
    const isBDHead = hasModule(decoded, "TEAM_MANAGEMENT");
    const isSales  = hasModule(decoded, "ORDERS") && !hasModule(decoded, "TEAM_MANAGEMENT");

    const startDate = new Date(year, month - 1, 1);
    const endDate   = new Date(year, month, 1);

    const where: any = {
      scheduledDate: { gte: startDate, lt: endDate },
      organizationId: decoded.organizationId,
    };

    if (isSales && !isAdmin && !isBDHead) {
      where.userId = decoded.userId;
    } else if (isBDHead && !isAdmin) {
      // BD_HEAD sees activities for their team members
      const teamMembers = await prisma.user.findMany({
        where: { managerId: decoded.userId },
        select: { id: true },
      });
      const teamIds = [decoded.userId, ...teamMembers.map((m) => m.id)];
      where.userId = { in: teamIds };
    }

    const activities = await prisma.schoolActivity.findMany({
      where,
      include: {
        school: { select: { id: true, name: true } },
        user:   { select: { id: true, name: true } },
      },
      orderBy: { scheduledDate: "asc" },
    });

    return NextResponse.json(activities);
  } catch (error) {
    console.error("Activities GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const token = getTokenFromRequest(req);
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const decoded = verifyToken(token);
    if (!decoded) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { schoolId, userId, type, scheduledDate, notes, location } = body;

    if (!schoolId || !type || !scheduledDate) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const activity = await prisma.schoolActivity.create({
      data: {
        schoolId,
        userId: userId ?? decoded.userId,
        type,
        scheduledDate: new Date(scheduledDate),
        notes:    notes    ?? null,
        location: location ?? null,
        organizationId: decoded.organizationId,
      },
      include: {
        school: { select: { id: true, name: true } },
        user:   { select: { id: true, name: true } },
      },
    });

    return NextResponse.json(activity, { status: 201 });
  } catch (error) {
    console.error("Activities POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const token = getTokenFromRequest(req);
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const decoded = verifyToken(token);
    if (!decoded) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    const body = await req.json();
    const { status, completedDate, notes } = body;

    const update: any = {};
    if (status !== undefined) update.status = status;
    if (completedDate !== undefined) update.completedDate = completedDate ? new Date(completedDate) : null;
    if (notes !== undefined) update.notes = notes;

    const activity = await prisma.schoolActivity.update({
      where: { id },
      data: update,
      include: {
        school: { select: { id: true, name: true } },
        user:   { select: { id: true, name: true } },
      },
    });

    return NextResponse.json(activity);
  } catch (error) {
    console.error("Activities PATCH error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
