import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken, getTokenFromRequest, hasModule } from "@/lib/auth";

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

    if (!doc || doc.deletedAt) return NextResponse.json({ error: "Not found" }, { status: 404 });

    console.log("Document body length:", doc?.body?.length ?? "NULL");

    const isAdmin      = hasModule(decoded, "USER_MANAGEMENT");
    const isBDHead     = hasModule(decoded, "TEAM_MANAGEMENT");
    const isDesign     = hasModule(decoded, "DESIGN_WORK");
    const isContentTeam = hasModule(decoded, "CONTENT_CREATE");

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
    const { docBody, body: rawBody, title } = body;
    const bodyContent = docBody ?? rawBody;

    const isAdmin = hasModule(decoded, "USER_MANAGEMENT");

    const doc = await (prisma as any).contentDocument.findUnique({ where: { id } });
    if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // Authors can edit their own docs at any status; admins can edit anything
    if (!isAdmin && doc.authorId !== decoded.userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const update: any = {};
    if (title        !== undefined) update.title = title;
    if (bodyContent  !== undefined) update.body  = bodyContent;

    const updated = await (prisma as any).contentDocument.update({ where: { id }, data: update });
    return NextResponse.json(updated);
  } catch (err: any) {
    console.error("Document PATCH error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
