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
    const statusFilter = searchParams.get("status");

    const where: any = { organizationId: decoded.organizationId };
    if (statusFilter) where.status = statusFilter;

    const sessions = await prisma.quizSession.findMany({
      where,
      include: {
        school: { select: { id: true, name: true } },
        conductedBy: { select: { id: true, name: true } },
        trainers: {
          include: { user: { select: { id: true, name: true } } },
        },
        _count: { select: { classResults: true } },
      },
      orderBy: { scheduledDate: "desc" },
    });

    return NextResponse.json(sessions);
  } catch (error) {
    console.error("Quiz sessions GET error:", error);
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
    const { title, format, schoolId, scheduledDate, conductedById, trainerIds } = body;

    if (!title || !format || !scheduledDate) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const session = await prisma.quizSession.create({
      data: {
        title,
        format,
        scheduledDate: new Date(scheduledDate),
        schoolId: schoolId ?? null,
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
        _count: { select: { classResults: true } },
      },
    });

    return NextResponse.json(session, { status: 201 });
  } catch (error) {
    console.error("Quiz sessions POST error:", error);
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
      participatingStudents,
      booksPitched,
      booksPitchedNotes,
      overallNotes,
      classResults,
      topPerformers,
    } = body;

    const update: any = {};
    if (status !== undefined) update.status = status;
    if (completedDate !== undefined) update.completedDate = completedDate ? new Date(completedDate) : null;
    if (participatingStudents !== undefined) update.participatingStudents = Number(participatingStudents);
    if (booksPitched !== undefined) update.booksPitched = booksPitched;
    if (booksPitchedNotes !== undefined) update.booksPitchedNotes = booksPitchedNotes;
    if (overallNotes !== undefined) update.overallNotes = overallNotes;

    // Handle classResults: delete existing and recreate
    if (classResults !== undefined) {
      await prisma.quizClassResult.deleteMany({ where: { quizSessionId: id } });
      update.classResults = {
        create: classResults.map((r: any) => ({
          className: r.className,
          studentsPresent: Number(r.studentsPresent),
          averageScore: r.averageScore != null ? Number(r.averageScore) : null,
          topScore: r.topScore != null ? Number(r.topScore) : null,
          teacherFeedback: r.teacherFeedback ?? null,
        })),
      };
    }

    // Handle topPerformers: delete existing and recreate
    if (topPerformers !== undefined) {
      await prisma.quizTopPerformer.deleteMany({ where: { quizSessionId: id } });
      update.topPerformers = {
        create: topPerformers.map((p: any) => ({
          studentName: p.studentName,
          className: p.className,
          score: p.score != null ? Number(p.score) : null,
          rank: p.rank != null ? Number(p.rank) : null,
          schoolId: p.schoolId ?? null,
        })),
      };
    }

    const session = await prisma.quizSession.update({
      where: { id },
      data: update,
      include: {
        school: { select: { id: true, name: true } },
        conductedBy: { select: { id: true, name: true } },
        trainers: { include: { user: { select: { id: true, name: true } } } },
        classResults: true,
        topPerformers: true,
        _count: { select: { classResults: true } },
      },
    });

    return NextResponse.json(session);
  } catch (error) {
    console.error("Quiz sessions PATCH error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
