import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken, getTokenFromRequest, hasModule } from "@/lib/auth";
import { fireDesignEmail } from "@/lib/sendDesignEmail";
import { writeAuditLog } from "@/lib/auditLog";
import sanitizeHtml from "sanitize-html";

export async function GET(req: Request) {
  try {
    const token = getTokenFromRequest(req);
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const decoded = verifyToken(token);
    if (!decoded) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const topicId      = searchParams.get("topicId");
    const statusFilter = searchParams.get("status");
    const docId        = searchParams.get("id");
    const page         = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
    const limit        = Math.min(200, Math.max(1, parseInt(searchParams.get("limit") ?? "100")));
    const skip         = (page - 1) * limit;

    const isAdmin = hasModule(decoded, "USER_MANAGEMENT");
    const isBDHead = hasModule(decoded, "TEAM_MANAGEMENT");
    const isContentTeam = hasModule(decoded, "CONTENT_CREATE");
    const isDesignTeam = hasModule(decoded, "DESIGN_WORK");

    const where: any = { deletedAt: null };

    // Single document fetch by ID
    if (docId) {
      const doc = await prisma.contentDocument.findUnique({
        where: { id: docId },
        include: {
          topic: true,
          author: { select: { id: true, name: true, email: true } },
        },
      });
      if (!doc || doc.deletedAt) return NextResponse.json({ error: "Not found" }, { status: 404 });
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

    const [docs, total] = await prisma.$transaction([
      prisma.contentDocument.findMany({
        where,
        include: {
          topic: { select: { id: true, title: true, productType: true, classFrom: true, classTo: true } },
          author: { select: { id: true, name: true, email: true } },
        },
        orderBy: { updatedAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.contentDocument.count({ where }),
    ]);

    return NextResponse.json({ docs, total, page, limit, pages: Math.ceil(total / limit) });
  } catch (error) {
    console.error("Content documents GET error:", error);
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

    const doc = await prisma.contentDocument.findUnique({ where: { id } });
    if (!doc || doc.deletedAt) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await prisma.contentDocument.update({
      where: { id },
      data:  { deletedAt: new Date() },
    });

    writeAuditLog({
      action:         "DOCUMENT_DELETE",
      entity:         "ContentDocument",
      entityId:       id,
      userId:         decoded.userId,
      organizationId: decoded.organizationId,
      metadata:       { title: doc.title, status: doc.status },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Content documents DELETE error:", error);
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
    const { topicId, title, body: docBody } = body;

    if (!topicId || !title) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const doc = await prisma.$transaction(async (tx) => {
      const created = await tx.contentDocument.create({
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
      // Link as primary document on topic if not already set
      await tx.contentTopic.update({
        where: { id: topicId },
        data: { documentId: created.id },
      });
      return created;
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
    const { id, action, title, docBody, body: rawBody, adminComment, designedFileUrl, designedFileName, wordCount, charCount } = body;
    const bodyContent = docBody ?? rawBody;

    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    const isAdmin = hasModule(decoded, "USER_MANAGEMENT");
    const isContentTeam = hasModule(decoded, "CONTENT_CREATE");
    const isDesignTeam = hasModule(decoded, "DESIGN_WORK");

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
          topicTitle: doc.topic?.title ?? "",
          productType: doc.topic?.productType ?? "",
          classFrom: doc.topic?.classFrom ?? 0,
          classTo: doc.topic?.classTo ?? 0,
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
    } else if (action === "resubmit") {
      if (!isAdmin && doc.authorId !== decoded.userId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      if (doc.status !== "REJECTED") {
        return NextResponse.json({ error: "Can only resubmit REJECTED documents" }, { status: 400 });
      }
      update.status = "SUBMITTED";
      update.adminComment = null;
    } else if (action === "upload_design") {
      if (!isDesignTeam && !isAdmin) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      if (designedFileUrl !== undefined) update.designedFileUrl = designedFileUrl;
      if (designedFileName !== undefined) update.designedFileName = designedFileName;
    } else {
      // Regular save (body + title update) — always allowed for the author regardless of status
      if (!isAdmin && doc.authorId !== decoded.userId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      if (title !== undefined) update.title = title;
      if (bodyContent !== undefined) {
        // Sanitize HTML to prevent XSS — allow safe formatting tags used by the editor
        update.body = sanitizeHtml(bodyContent, {
          allowedTags: sanitizeHtml.defaults.allowedTags.concat([
            "img", "h1", "h2", "h3", "h4", "h5", "h6", "u", "s", "sup", "sub",
            "table", "thead", "tbody", "tr", "th", "td", "colgroup", "col",
          ]),
          allowedAttributes: {
            ...sanitizeHtml.defaults.allowedAttributes,
            "*": ["style", "class", "id", "align"],
            "a": ["href", "target", "rel"],
            "img": ["src", "alt", "width", "height"],
            "td": ["colspan", "rowspan"],
            "th": ["colspan", "rowspan"],
          },
          allowedSchemes: ["http", "https", "data"],
        });
      }
      if (wordCount !== undefined) update.wordCount = Number(wordCount);
      if (charCount !== undefined) update.charCount = Number(charCount);
    }

    const updated = await prisma.contentDocument.update({
      where: { id },
      data: update,
      include: {
        topic: { select: { id: true, title: true, productType: true, classFrom: true, classTo: true } },
        author: { select: { id: true, name: true, email: true } },
      },
    });

    // Auto-snapshot on submit or approve (immutable version record)
    if (action === "submit" || action === "approve") {
      const last = await (prisma as any).contentDocumentVersion.findFirst({
        where:   { documentId: id },
        orderBy: { version: "desc" },
        select:  { version: true },
      });
      await (prisma as any).contentDocumentVersion.create({
        data: {
          documentId: id,
          version:    (last?.version ?? 0) + 1,
          body:       updated.body ?? "",
          title:      updated.title,
          status:     updated.status,
          savedById:  decoded.userId,
        },
      });
    }

    // Audit log for status transitions
    if (action && ["submit","approve","reject","send_to_design","publish","resubmit"].includes(action)) {
      writeAuditLog({
        action:         `DOCUMENT_${action.toUpperCase()}`,
        entity:         "ContentDocument",
        entityId:       id,
        userId:         decoded.userId,
        userName:       updated.author?.name ?? undefined,
        organizationId: decoded.organizationId,
        metadata:       { title: updated.title, status: updated.status, adminComment: adminComment ?? null },
      });
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Content documents PATCH error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
