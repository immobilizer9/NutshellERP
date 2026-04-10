import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken, getTokenFromRequest, hasModule } from "@/lib/auth";
import { writeAuditLog } from "@/lib/auditLog";
import { createTopicSchema, patchTopicSchema, validateBody } from "@/lib/validate";

const DOC_INCLUDE = {
  id: true, status: true, updatedAt: true, adminComment: true, wordCount: true, body: true,
} as const;

export async function GET(req: Request) {
  try {
    const token = getTokenFromRequest(req);
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const decoded = verifyToken(token);
    if (!decoded) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const statusFilter  = searchParams.get("status");
    const page          = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
    const limit         = Math.min(200, Math.max(1, parseInt(searchParams.get("limit") ?? "100")));
    const skip          = (page - 1) * limit;

    const isAdmin = hasModule(decoded, "USER_MANAGEMENT");

    const where: any = { deletedAt: null };
    if (!isAdmin) {
      where.assignedToId = decoded.userId;
    }
    if (statusFilter) where.status = statusFilter;

    const [topics, total] = await prisma.$transaction([
      prisma.contentTopic.findMany({
        where,
        include: {
          assignedTo: { select: { id: true, name: true, email: true } },
          assignedBy: { select: { id: true, name: true } },
          document: { select: DOC_INCLUDE },
          documents: { select: DOC_INCLUDE, orderBy: { updatedAt: "desc" }, take: 1 },
          _count: { select: { documents: true } },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.contentTopic.count({ where }),
    ]);

    return NextResponse.json({ topics, total, page, limit, pages: Math.ceil(total / limit) });
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
    if (!decoded || !hasModule(decoded, "CONTENT_ASSIGN")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const rawBody = await req.json();
    const validErr = validateBody(createTopicSchema, { ...rawBody, classFrom: Number(rawBody.classFrom), classTo: Number(rawBody.classTo) });
    if (validErr) return validErr;
    const { title, description, productType, classFrom, classTo, assignedToId, dueDate, bookNumber, year } = rawBody;

    // Create topic + primary document in one transaction
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create topic (documentId set after doc is created)
      const topic = await tx.contentTopic.create({
        data: {
          title,
          description: description ?? null,
          productType,
          classFrom: Number(classFrom),
          classTo:   Number(classTo),
          assignedToId,
          assignedById: decoded.userId,
          dueDate:    dueDate ? new Date(dueDate) : null,
          bookNumber: bookNumber ? Number(bookNumber) : null,
          year:       year      ? Number(year)       : new Date().getFullYear(),
        },
      });

      // 2. Create primary document
      const doc = await tx.contentDocument.create({
        data: {
          topicId:  topic.id,
          title,
          body:     "",
          authorId: assignedToId,
          status:   "DRAFT",
        },
      });

      // 3. Link document back to topic
      const updated = await tx.contentTopic.update({
        where: { id: topic.id },
        data:  { documentId: doc.id },
        include: {
          assignedTo: { select: { id: true, name: true } },
          assignedBy: { select: { id: true, name: true } },
          document:   { select: DOC_INCLUDE },
          _count:     { select: { documents: true } },
        },
      });

      return updated;
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error("Content topics POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const token = getTokenFromRequest(req);
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const decoded = verifyToken(token);
    if (!decoded || !hasModule(decoded, "USER_MANAGEMENT")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    const topic = await prisma.contentTopic.findUnique({ where: { id } });
    if (!topic || topic.deletedAt) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const now = new Date();
    // Soft-delete topic and all its documents in one transaction
    await prisma.$transaction([
      prisma.contentDocument.updateMany({
        where: { topicId: id, deletedAt: null },
        data:  { deletedAt: now },
      }),
      prisma.contentTopic.update({
        where: { id },
        data:  { deletedAt: now },
      }),
    ]);

    writeAuditLog({
      action:         "TOPIC_DELETE",
      entity:         "ContentTopic",
      entityId:       id,
      userId:         decoded.userId,
      organizationId: decoded.organizationId,
      metadata:       { title: topic.title },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Content topics DELETE error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const token = getTokenFromRequest(req);
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const decoded = verifyToken(token);
    if (!decoded || !hasModule(decoded, "CONTENT_ASSIGN")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const rawBody = await req.json();
    const validErr = validateBody(patchTopicSchema, rawBody);
    if (validErr) return validErr;
    const { id, status, assignedToId, title, description, dueDate, bookNumber, year } = rawBody;

    const update: any = {};
    if (status      !== undefined) update.status      = status;
    if (assignedToId !== undefined) update.assignedToId = assignedToId;
    if (title       !== undefined) update.title       = title;
    if (description !== undefined) update.description = description;
    if (dueDate     !== undefined) update.dueDate     = dueDate ? new Date(dueDate) : null;
    if (bookNumber  !== undefined) update.bookNumber  = bookNumber ? Number(bookNumber) : null;
    if (year        !== undefined) update.year        = year ? Number(year) : null;

    const topic = await prisma.contentTopic.update({
      where: { id },
      data: update,
      include: {
        assignedTo: { select: { id: true, name: true } },
        assignedBy: { select: { id: true, name: true } },
        document:   { select: DOC_INCLUDE },
        documents:  { select: DOC_INCLUDE, orderBy: { updatedAt: "desc" }, take: 1 },
        _count:     { select: { documents: true } },
      },
    });

    return NextResponse.json(topic);
  } catch (error) {
    console.error("Content topics PATCH error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
