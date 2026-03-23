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
    const bankId = searchParams.get("bankId");

    if (!bankId) return NextResponse.json({ error: "Missing bankId" }, { status: 400 });

    const questions = await prisma.question.findMany({
      where: { bankId },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json(questions);
  } catch (error) {
    console.error("Questions GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const token = getTokenFromRequest(req);
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const decoded = verifyToken(token);
    if (!decoded) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const isAdmin = decoded.roles.includes("ADMIN");
    const isContentTeam = decoded.roles.includes("CONTENT_TEAM");

    if (!isAdmin && !isContentTeam) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { bankId, text, optionA, optionB, optionC, optionD, correctOption, explanation, classLevel, difficulty } = body;

    if (!bankId || !text || !optionA || !optionB || !optionC || !optionD || !correctOption) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const question = await prisma.question.create({
      data: {
        bankId,
        text,
        optionA,
        optionB,
        optionC,
        optionD,
        correctOption,
        explanation: explanation ?? null,
        classLevel: classLevel != null ? Number(classLevel) : null,
        difficulty: difficulty ?? "MEDIUM",
      },
    });

    return NextResponse.json(question, { status: 201 });
  } catch (error) {
    console.error("Questions POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const token = getTokenFromRequest(req);
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const decoded = verifyToken(token);
    if (!decoded) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const isAdmin = decoded.roles.includes("ADMIN");
    const isContentTeam = decoded.roles.includes("CONTENT_TEAM");

    if (!isAdmin && !isContentTeam) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    await prisma.question.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Questions DELETE error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
