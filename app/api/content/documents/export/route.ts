import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken, getTokenFromRequest, hasModule } from "@/lib/auth";

export async function GET(req: Request) {
  try {
    const token = getTokenFromRequest(req);
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const decoded = verifyToken(token);
    if (!decoded) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    const doc = await prisma.contentDocument.findUnique({
      where: { id },
      include: {
        topic: true,
        author: { select: { id: true, name: true } },
      },
    });

    if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const isAdmin = hasModule(decoded, "USER_MANAGEMENT");
    const isDesignTeam = hasModule(decoded, "DESIGN_WORK");
    if (!isAdmin && !isDesignTeam && doc.authorId !== decoded.userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const safeTitle = doc.title.replace(/[^a-z0-9\s-]/gi, "").trim().replace(/\s+/g, "-");

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${doc.title}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 15px;
      line-height: 1.7;
      color: #1a1a2e;
      background: #ffffff;
      padding: 40px;
      max-width: 800px;
      margin: 0 auto;
    }
    .doc-header {
      border-bottom: 2px solid #e2e8f0;
      padding-bottom: 24px;
      margin-bottom: 32px;
    }
    h1 { font-size: 28px; font-weight: 700; margin-bottom: 12px; color: #0f172a; }
    .meta { display: flex; gap: 16px; flex-wrap: wrap; font-size: 13px; color: #64748b; }
    .badge {
      display: inline-block;
      padding: 2px 10px;
      border-radius: 999px;
      font-size: 12px;
      font-weight: 600;
      background: #e0f2fe;
      color: #0369a1;
    }
    .body { line-height: 1.8; }
    .body h1 { font-size: 22px; margin: 24px 0 12px; }
    .body h2 { font-size: 18px; margin: 20px 0 10px; }
    .body p { margin-bottom: 12px; }
    .body ul, .body ol { margin: 12px 0 12px 24px; }
    .body li { margin-bottom: 6px; }
    .footer { margin-top: 48px; padding-top: 16px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #94a3b8; }
  </style>
</head>
<body>
  <div class="doc-header">
    <h1>${doc.title}</h1>
    <div class="meta">
      <span><strong>Topic:</strong> ${doc.topic?.title ?? "—"}</span>
      <span class="badge">${doc.topic?.productType ?? "—"}</span>
      <span>Class ${doc.topic?.classFrom ?? "—"}–${doc.topic?.classTo ?? "—"}</span>
      <span><strong>Status:</strong> ${doc.status}</span>
      <span><strong>Author:</strong> ${doc.author.name}</span>
      <span><strong>Version:</strong> ${doc.version}</span>
    </div>
    ${doc.adminComment ? `<div style="margin-top:12px;padding:10px 14px;background:#fef2f2;border-left:3px solid #ef4444;border-radius:4px;font-size:13px;color:#991b1b;"><strong>Admin Note:</strong> ${doc.adminComment}</div>` : ""}
  </div>
  <div class="body">
    ${doc.body || "<p><em>No content yet.</em></p>"}
  </div>
  <div class="footer">
    Exported from Nutshell ERP · ${new Date().toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" })}
  </div>
</body>
</html>`;

    return new Response(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Content-Disposition": `attachment; filename="${safeTitle}.html"`,
      },
    });
  } catch (error) {
    console.error("Document export error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
