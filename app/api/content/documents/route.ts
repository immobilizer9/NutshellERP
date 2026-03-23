import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken, getTokenFromRequest } from "@/lib/auth";
import { fireDesignEmail } from "@/lib/sendDesignEmail";

export async function GET(req: Request) {
  try {
    const token = getTokenFromRequest(req);
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const decoded = verifyToken(token);
    if (!decoded) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const topicId = searchParams.get("topicId");
    const statusFilter = searchParams.get("status");
    const docId = searchParams.get("id");

    const isAdmin = decoded.roles.includes("ADMIN");
    const isBDHead = decoded.roles.includes("BD_HEAD");
    const isContentTeam = decoded.roles.includes("CONTENT_TEAM");
    const isDesignTeam = decoded.roles.includes("DESIGN_TEAM");

    const where: any = {};

    // Single document fetch by ID
    if (docId) {
      const doc = await prisma.contentDocument.findUnique({
        where: { id: docId },
        include: {
          topic: true,
          author: { select: { id: true, name: true, email: true } },
        },
      });
      if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });
      // Access control
      if (!isAdmin && !isBDHead && !isDesignTeam && doc.authorId !== decoded.userId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      return NextResponse.json(doc);
    }

    // CONTENT_TEAM sees only their own docs
    if (!isAdmin && !isBDHead && !isDesignTeam) {
      where.authorId = decoded.userId;
    }

    if (topicId) where.topicId = topicId;
    if (statusFilter) where.status = statusFilter;

    const docs = await prisma.contentDocument.findMany({
      where,
      include: {
        topic: {
          select: { id: true, title: true, productType: true, classFrom: true, classTo: true },
        },
        author: { select: { id: true, name: true, email: true } },
      },
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json(docs);
  } catch (error) {
    console.error("Content documents GET error:", error);
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
    const { topicId, title, body: docBody } = body;

    if (!topicId || !title) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const doc = await prisma.contentDocument.create({
      data: {
        topicId,
        title,
        body: docBody ?? "",
        authorId: decoded.userId,
        status: "DRAFT",
      },
      include: {
        topic: { select: { id: true, title: true, productType: true, classFrom: true, classTo: true } },
        author: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json(doc, { status: 201 });
  } catch (error) {
    console.error("Content documents POST error:", error);
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
    const { id, action, title, docBody, body: rawBody, adminComment, designedFileUrl, designedFileName } = body;
    const bodyContent = docBody ?? rawBody;

    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    const isAdmin = decoded.roles.includes("ADMIN");
    const isContentTeam = decoded.roles.includes("CONTENT_TEAM");
    const isDesignTeam = decoded.roles.includes("DESIGN_TEAM");

    const doc = await prisma.contentDocument.findUnique({
      where: { id },
      include: { topic: true, author: { select: { id: true, name: true, email: true } } },
    });
    if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });

    let update: any = {};

    if (action === "submit") {
      // CONTENT_TEAM can submit DRAFT or REJECTED docs
      if (!isAdmin && doc.authorId !== decoded.userId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      if (doc.status !== "DRAFT" && doc.status !== "REJECTED") {
        return NextResponse.json({ error: "Can only submit DRAFT or REJECTED documents" }, { status: 400 });
      }
      update.status = "SUBMITTED";
    } else if (action === "approve") {
      if (!isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      update.status = "APPROVED";
    } else if (action === "reject") {
      if (!isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      update.status = "REJECTED";
      update.adminComment = adminComment ?? null;
    } else if (action === "send_to_design") {
      if (!isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      update.status = "DESIGN_SENT";
      update.sentToDesignAt = new Date();
      if (adminComment !== undefined) update.adminComment = adminComment;

      // Fire design email non-blocking
      const designTeamUsers = await prisma.user.findMany({
        where: {
          organizationId: decoded.organizationId,
          roles: { some: { role: { name: "DESIGN_TEAM" } } },
        },
        select: { email: true },
      });
      const designEmails = designTeamUsers.map((u) => u.email);
      if (designEmails.length > 0) {
        fireDesignEmail({
          documentId: doc.id,
          documentTitle: doc.title,
          topicTitle: doc.topic.title,
          productType: doc.topic.productType,
          classFrom: doc.topic.classFrom,
          classTo: doc.topic.classTo,
          adminComment: adminComment ?? null,
          bodyHtml: doc.body,
          designTeamEmails: designEmails,
          erpBaseUrl: process.env.NEXT_PUBLIC_APP_URL ?? "",
        });
      }
    } else if (action === "publish") {
      if (!isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      update.status = "PUBLISHED";
      update.publishedAt = new Date();
    } else if (action === "upload_design") {
      if (!isDesignTeam && !isAdmin) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      if (designedFileUrl !== undefined) update.designedFileUrl = designedFileUrl;
      if (designedFileName !== undefined) update.designedFileName = designedFileName;
    } else {
      // Regular save (body + title update) — only DRAFT or REJECTED
      if (!isAdmin && doc.authorId !== decoded.userId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      if (!isAdmin && doc.status !== "DRAFT" && doc.status !== "REJECTED") {
        return NextResponse.json({ error: "Cannot edit document in current status" }, { status: 400 });
      }
      if (title !== undefined) update.title = title;
      if (bodyContent !== undefined) update.body = bodyContent;
    }

    const updated = await prisma.contentDocument.update({
      where: { id },
      data: update,
      include: {
        topic: { select: { id: true, title: true, productType: true, classFrom: true, classTo: true } },
        author: { select: { id: true, name: true, email: true } },
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Content documents PATCH error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
