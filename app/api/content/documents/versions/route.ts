import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken, getTokenFromRequest, hasModule } from "@/lib/auth";

/**
 * GET /api/content/documents/versions?documentId=xxx
 * Returns all version snapshots for a document (newest first).
 *
 * POST /api/content/documents/versions
 * Body: { documentId, body, title, status }
 * Creates a snapshot manually (called on submit/approve transitions).
 */

export async function GET(req: Request) {
  try {
    const token = getTokenFromRequest(req);
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const decoded = verifyToken(token);
    if (!decoded) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const documentId = searchParams.get("documentId");
    if (!documentId) return NextResponse.json({ error: "documentId is required" }, { status: 400 });

    // Verify access: must own doc, be admin, or be BD head
    const doc = await prisma.contentDocument.findUnique({ where: { id: documentId } });
    if (!doc || doc.deletedAt) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const isAdmin = hasModule(decoded, "USER_MANAGEMENT");
    if (!isAdmin && doc.authorId !== decoded.userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const versions = await (prisma as any).contentDocumentVersion.findMany({
      where:   { documentId },
      orderBy: { version: "desc" },
      select:  { id: true, version: true, title: true, status: true, savedById: true, createdAt: true },
    });

    return NextResponse.json(versions);
  } catch (err) {
    console.error("Document versions GET error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const token = getTokenFromRequest(req);
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const decoded = verifyToken(token);
    if (!decoded) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { documentId, body, title, status } = await req.json();
    if (!documentId) return NextResponse.json({ error: "documentId is required" }, { status: 400 });

    const doc = await prisma.contentDocument.findUnique({ where: { id: documentId } });
    if (!doc || doc.deletedAt) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const isAdmin = hasModule(decoded, "USER_MANAGEMENT");
    if (!isAdmin && doc.authorId !== decoded.userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get the next version number
    const last = await (prisma as any).contentDocumentVersion.findFirst({
      where:   { documentId },
      orderBy: { version: "desc" },
      select:  { version: true },
    });
    const nextVersion = (last?.version ?? 0) + 1;

    const snapshot = await (prisma as any).contentDocumentVersion.create({
      data: {
        documentId,
        version:   nextVersion,
        body:      body ?? doc.body,
        title:     title ?? doc.title,
        status:    status ?? doc.status,
        savedById: decoded.userId,
      },
    });

    return NextResponse.json(snapshot, { status: 201 });
  } catch (err) {
    console.error("Document versions POST error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * GET /api/content/documents/versions?documentId=xxx&versionId=yyy
 * Returns the full body of a specific version for diff/restore.
 */
