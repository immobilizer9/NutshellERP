import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken, getTokenFromRequest } from "@/lib/auth";

export async function GET(req: Request) {
  try {
    const token = getTokenFromRequest(req);
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const decoded = verifyToken(token);
    if (!decoded) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const statusFilter = searchParams.get("status");

    const where: any = { organizationId: decoded.organizationId };
    if (statusFilter) where.status = statusFilter;

    const sessions = await prisma.trainingSession.findMany({
      where,
      include: {
        school: { select: { id: true, name: true } },
        conductedBy: { select: { id: true, name: true } },
        trainers: {
          include: { user: { select: { id: true, name: true } } },
        },
      },
      orderBy: { scheduledDate: "desc" },
    });

    return NextResponse.json(sessions);
  } catch (error) {
    console.error("Training sessions GET error:", error);
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
    const { title, topic, schoolId, scheduledDate, conductedById, trainerIds } = body;

    if (!title || !topic || !schoolId || !scheduledDate) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const session = await prisma.trainingSession.create({
      data: {
        title,
        topic,
        schoolId,
        scheduledDate: new Date(scheduledDate),
        conductedById: conductedById ?? decoded.userId,
        organizationId: decoded.organizationId,
        trainers: trainerIds?.length
          ? { create: trainerIds.map((uid: string) => ({ userId: uid })) }
          : undefined,
      },
      include: {
        school: { select: { id: true, name: true } },
        conductedBy: { select: { id: true, name: true } },
        trainers: { include: { user: { select: { id: true, name: true } } } },
      },
    });

    return NextResponse.json(session, { status: 201 });
  } catch (error) {
    console.error("Training sessions POST error:", error);
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
    const {
      status,
      completedDate,
      teachersAttended,
      durationMinutes,
      overallNotes,
      teacherFeedback,
      followUpRequired,
      followUpNotes,
    } = body;

    const update: any = {};
    if (status !== undefined) update.status = status;
    if (completedDate !== undefined) update.completedDate = completedDate ? new Date(completedDate) : null;
    if (teachersAttended !== undefined) update.teachersAttended = Number(teachersAttended);
    if (durationMinutes !== undefined) update.durationMinutes = Number(durationMinutes);
    if (overallNotes !== undefined) update.overallNotes = overallNotes;
    if (teacherFeedback !== undefined) update.teacherFeedback = teacherFeedback;
    if (followUpRequired !== undefined) update.followUpRequired = followUpRequired;
    if (followUpNotes !== undefined) update.followUpNotes = followUpNotes;

    const session = await prisma.trainingSession.update({
      where: { id },
      data: update,
      include: {
        school: { select: { id: true, name: true } },
        conductedBy: { select: { id: true, name: true } },
        trainers: { include: { user: { select: { id: true, name: true } } } },
      },
    });

    return NextResponse.json(session);
  } catch (error) {
    console.error("Training sessions PATCH error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
