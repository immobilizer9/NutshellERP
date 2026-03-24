import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken, getTokenFromRequest } from "@/lib/auth";

/** GET /api/content/documents/[id]  — fetch single document with comments */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const token = getTokenFromRequest(req);
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const decoded = verifyToken(token);
    if (!decoded) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;

    const doc = await (prisma as any).contentDocument.findUnique({
      where: { id },
      include: {
        topic:  true,
        author: { select: { id: true, name: true, email: true } },
        comments: {
          include: { author: { select: { id: true, name: true } } },
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const isAdmin      = decoded.roles.includes("ADMIN");
    const isBDHead     = decoded.roles.includes("BD_HEAD");
    const isDesign     = decoded.roles.includes("DESIGN_TEAM");
    const isContentTeam = decoded.roles.includes("CONTENT_TEAM");

    if (!isAdmin && !isBDHead && !isDesign && !isContentTeam && doc.authorId !== decoded.userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json({ ...doc, isAdmin });
  } catch (err: any) {
    console.error("Document GET error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/** PATCH /api/content/documents/[id]  — admin can edit body directly during review */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const token = getTokenFromRequest(req);
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const decoded = verifyToken(token);
    if (!decoded) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const body = await req.json();
    const { docBody, title } = body;

    const isAdmin = decoded.roles.includes("ADMIN");

    const doc = await (prisma as any).contentDocument.findUnique({ where: { id } });
    if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // Authors can edit their own DRAFT/REJECTED docs; admins can edit anything
    if (!isAdmin && doc.authorId !== decoded.userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (!isAdmin && doc.status !== "DRAFT" && doc.status !== "REJECTED") {
      return NextResponse.json({ error: "Cannot edit document in current status" }, { status: 400 });
    }

    const update: any = {};
    if (title    !== undefined) update.title = title;
    if (docBody  !== undefined) update.body  = docBody;

    const updated = await (prisma as any).contentDocument.update({ where: { id }, data: update });
    return NextResponse.json(updated);
  } catch (err: any) {
    console.error("Document PATCH error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
