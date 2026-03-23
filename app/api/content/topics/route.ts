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

    const isAdmin = decoded.roles.includes("ADMIN");
    const isContentTeam = decoded.roles.includes("CONTENT_TEAM");

    const where: any = {};
    if (!isAdmin) {
      // CONTENT_TEAM sees only their assigned topics
      where.assignedToId = decoded.userId;
    }
    if (statusFilter) where.status = statusFilter;

    const topics = await prisma.contentTopic.findMany({
      where,
      include: {
        assignedTo: { select: { id: true, name: true, email: true } },
        assignedBy: { select: { id: true, name: true } },
        _count: { select: { documents: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(topics);
  } catch (error) {
    console.error("Content topics GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const token = getTokenFromRequest(req);
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const decoded = verifyToken(token);
    if (!decoded || !decoded.roles.includes("ADMIN")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { title, description, productType, classFrom, classTo, assignedToId, dueDate } = body;

    if (!title || !productType || !assignedToId || classFrom == null || classTo == null) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const topic = await prisma.contentTopic.create({
      data: {
        title,
        description: description ?? null,
        productType,
        classFrom: Number(classFrom),
        classTo: Number(classTo),
        assignedToId,
        assignedById: decoded.userId,
        dueDate: dueDate ? new Date(dueDate) : null,
      },
      include: {
        assignedTo: { select: { id: true, name: true } },
        assignedBy: { select: { id: true, name: true } },
        _count: { select: { documents: true } },
      },
    });

    return NextResponse.json(topic, { status: 201 });
  } catch (error) {
    console.error("Content topics POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const token = getTokenFromRequest(req);
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const decoded = verifyToken(token);
    if (!decoded || !decoded.roles.includes("ADMIN")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { id, status, assignedToId, title, description, dueDate } = body;

    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    const update: any = {};
    if (status !== undefined) update.status = status;
    if (assignedToId !== undefined) update.assignedToId = assignedToId;
    if (title !== undefined) update.title = title;
    if (description !== undefined) update.description = description;
    if (dueDate !== undefined) update.dueDate = dueDate ? new Date(dueDate) : null;

    const topic = await prisma.contentTopic.update({
      where: { id },
      data: update,
      include: {
        assignedTo: { select: { id: true, name: true } },
        assignedBy: { select: { id: true, name: true } },
        _count: { select: { documents: true } },
      },
    });

    return NextResponse.json(topic);
  } catch (error) {
    console.error("Content topics PATCH error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
