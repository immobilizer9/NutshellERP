import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken, getTokenFromRequest, hasModule } from "@/lib/auth";

export async function GET(req: Request) {
  try {
    const token = getTokenFromRequest(req);
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const decoded = verifyToken(token);
    if (!decoded) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const banks = await prisma.questionBank.findMany({
      where: { organizationId: decoded.organizationId },
      include: {
        createdBy: { select: { id: true, name: true } },
        _count: { select: { questions: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(banks);
  } catch (error) {
    console.error("Question banks GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const token = getTokenFromRequest(req);
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const decoded = verifyToken(token);
    if (!decoded) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const isAdmin = hasModule(decoded, "USER_MANAGEMENT");
    const isContentTeam = hasModule(decoded, "CONTENT_CREATE");

    if (!isAdmin && !isContentTeam) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { title, description, subject, classFrom, classTo, difficulty } = body;

    if (!title || classFrom == null || classTo == null) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const bank = await prisma.questionBank.create({
      data: {
        title,
        description: description ?? null,
        subject: subject ?? "GK",
        classFrom: Number(classFrom),
        classTo: Number(classTo),
        difficulty: difficulty ?? "MEDIUM",
        createdById: decoded.userId,
        organizationId: decoded.organizationId,
      },
      include: {
        createdBy: { select: { id: true, name: true } },
        _count: { select: { questions: true } },
      },
    });

    return NextResponse.json(bank, { status: 201 });
  } catch (error) {
    console.error("Question banks POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const token = getTokenFromRequest(req);
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const decoded = verifyToken(token);
    if (!decoded) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { id, status, title, description, difficulty } = body;

    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    const update: any = {};
    if (status !== undefined) update.status = status;
    if (title !== undefined) update.title = title;
    if (description !== undefined) update.description = description;
    if (difficulty !== undefined) update.difficulty = difficulty;

    const bank = await prisma.questionBank.update({
      where: { id },
      data: update,
      include: {
        createdBy: { select: { id: true, name: true } },
        _count: { select: { questions: true } },
      },
    });

    return NextResponse.json(bank);
  } catch (error) {
    console.error("Question banks PATCH error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
