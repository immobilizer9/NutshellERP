import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken, getTokenFromRequest } from "@/lib/auth";

export async function GET(req: Request) {
  try {
    const token = getTokenFromRequest(req);
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const decoded = verifyToken(token);
    if (!decoded) return NextResponse.json({ error: "Invalid token" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const from = searchParams.get("from");
    const to   = searchParams.get("to");

    let where: any = {};

    if (decoded.roles.includes("SALES")) {
      where.createdById = decoded.userId;
    } else if (decoded.roles.includes("BD_HEAD")) {
      const team = await prisma.user.findMany({
        where: { managerId: decoded.userId },
        select: { id: true },
      });
      const teamIds = [decoded.userId, ...team.map((u) => u.id)];
      where.createdById = { in: teamIds };
    }
    // ADMIN sees all

    if (from) where.date = { ...where.date, gte: new Date(from) };
    if (to)   where.date = { ...where.date, lte: new Date(to) };

    const events = await prisma.schoolEvent.findMany({
      where,
      include: {
        school:    { select: { id: true, name: true, city: true } },
        createdBy: { select: { id: true, name: true } },
      },
      orderBy: { date: "asc" },
    });

    return NextResponse.json(events);
  } catch (err) {
    console.error("Events GET error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const token = getTokenFromRequest(req);
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const decoded = verifyToken(token);
    if (!decoded) return NextResponse.json({ error: "Invalid token" }, { status: 401 });

    const body = await req.json();
    const { schoolId, type, date, notes } = body;

    if (!schoolId || !type || !date) {
      return NextResponse.json({ error: "schoolId, type, and date are required" }, { status: 400 });
    }

    const validTypes = ["QUIZ", "TEACHER_TRAINING", "MEETING"];
    if (!validTypes.includes(type)) {
      return NextResponse.json({ error: "Invalid event type" }, { status: 400 });
    }

    const event = await prisma.schoolEvent.create({
      data: {
        schoolId,
        type,
        date:        new Date(date),
        notes:       notes ?? null,
        createdById: decoded.userId,
      },
      include: {
        school:    { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json(event, { status: 201 });
  } catch (err) {
    console.error("Events POST error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const token = getTokenFromRequest(req);
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const decoded = verifyToken(token);
    if (!decoded) return NextResponse.json({ error: "Invalid token" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

    // Only creator or admin can delete
    const event = await prisma.schoolEvent.findUnique({ where: { id } });
    if (!event) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const isAdmin = decoded.roles.includes("ADMIN");
    if (!isAdmin && event.createdById !== decoded.userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await prisma.schoolEvent.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Events DELETE error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
