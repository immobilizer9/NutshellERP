import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken, getTokenFromRequest, hasModule } from "@/lib/auth";

/** GET /api/content/documents/[id]/comments */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const token = getTokenFromRequest(req);
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const decoded = verifyToken(token);
    if (!decoded) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id: documentId } = await params;

    const comments = await (prisma as any).documentComment.findMany({
      where: { documentId },
      include: { author: { select: { id: true, name: true } } },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json(comments);
  } catch (err: any) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/** POST /api/content/documents/[id]/comments — add a new comment */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const token = getTokenFromRequest(req);
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const decoded = verifyToken(token);
    if (!decoded) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id: documentId } = await params;
    const { quotedText, body } = await req.json();

    if (!quotedText?.trim() || !body?.trim()) {
      return NextResponse.json({ error: "quotedText and body are required" }, { status: 400 });
    }

    const doc = await (prisma as any).contentDocument.findUnique({ where: { id: documentId } });
    if (!doc) return NextResponse.json({ error: "Document not found" }, { status: 404 });

    const comment = await (prisma as any).documentComment.create({
      data: {
        documentId,
        authorId:  decoded.userId,
        quotedText: quotedText.trim(),
        body:       body.trim(),
      },
      include: { author: { select: { id: true, name: true } } },
    });

    return NextResponse.json(comment, { status: 201 });
  } catch (err: any) {
    console.error("Comment POST error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/** PATCH /api/content/documents/[id]/comments — resolve or delete a comment */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const token = getTokenFromRequest(req);
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const decoded = verifyToken(token);
    if (!decoded) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id: documentId } = await params;
    const { commentId, action } = await req.json();

    if (!commentId) return NextResponse.json({ error: "commentId required" }, { status: 400 });

    const comment = await (prisma as any).documentComment.findUnique({
      where: { id: commentId },
    });
    if (!comment || comment.documentId !== documentId) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const isAdmin  = hasModule(decoded, "USER_MANAGEMENT");
    const isAuthor = comment.authorId === decoded.userId;

    if (!isAdmin && !isAuthor) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (action === "delete") {
      await (prisma as any).documentComment.delete({ where: { id: commentId } });
      return NextResponse.json({ success: true });
    }

    // Default: toggle resolved
    const updated = await (prisma as any).documentComment.update({
      where: { id: commentId },
      data:  { resolved: !comment.resolved },
      include: { author: { select: { id: true, name: true } } },
    });
    return NextResponse.json(updated);
  } catch (err: any) {
    console.error("Comment PATCH error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
