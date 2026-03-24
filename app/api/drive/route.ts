import { NextResponse } from "next/server";
import { google } from "googleapis";
import { prisma } from "@/lib/prisma";
import { verifyToken, getTokenFromRequest } from "@/lib/auth";
import fs from "fs";
import path from "path";

/** Google Drive auth via service account */
function getDriveClient() {
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    },
    scopes: ["https://www.googleapis.com/auth/drive"],
  });
  return google.drive({ version: "v3", auth });
}

/** Read the active Drive root folder: DB settings → env fallback */
function getConfiguredFolderId(): string {
  try {
    const settingsPath = path.join(process.cwd(), "config", "settings.json");
    if (fs.existsSync(settingsPath)) {
      const s = JSON.parse(fs.readFileSync(settingsPath, "utf-8"));
      if (s.driveFolderId) return s.driveFolderId;
    }
  } catch { /* ignore */ }
  return process.env.GOOGLE_DRIVE_FOLDER_ID ?? "";
}

/** Find or create a sub-folder by name inside parentId */
async function findOrCreateFolder(drive: any, name: string, parentId: string): Promise<string> {
  const res = await drive.files.list({
    q: `name='${name}' and mimeType='application/vnd.google-apps.folder' and '${parentId}' in parents and trashed=false`,
    fields: "files(id,name)",
    spaces: "drive",
  });
  if (res.data.files?.length) return res.data.files[0].id as string;

  const created = await drive.files.create({
    requestBody: { name, mimeType: "application/vnd.google-apps.folder", parents: [parentId] },
    fields: "id",
  });
  return created.data.id as string;
}

/**
 * GET /api/drive?action=list[&folderId=xxx]  — list files in the configured root folder (or given folder)
 * GET /api/drive?action=export&fileId=xxx    — export a Google Doc/file as HTML
 * GET /api/drive?action=folders[&parentId=xxx] — list subfolders (ADMIN only); no parentId = top-level shared folders
 * GET /api/drive?action=folder-info&folderId=xxx — get folder name/metadata
 */
export async function GET(req: Request) {
  try {
    const token = getTokenFromRequest(req);
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const decoded = verifyToken(token);
    if (!decoded) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const action   = searchParams.get("action") ?? "list";
    const fileId   = searchParams.get("fileId");
    const parentId = searchParams.get("parentId");
    const folderId = searchParams.get("folderId");

    const drive = getDriveClient();

    // ── Folder browsing (ADMIN only) ──────────────────────────────────────────
    if (action === "folders") {
      if (!decoded.roles.includes("ADMIN")) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      let q: string;
      if (parentId) {
        // subfolders of a given parent
        q = `mimeType='application/vnd.google-apps.folder' and '${parentId}' in parents and trashed=false`;
      } else {
        // All folders the service account can see (shared directly with it)
        q = `mimeType='application/vnd.google-apps.folder' and trashed=false`;
      }
      const res = await drive.files.list({
        q,
        fields: "files(id,name,parents,modifiedTime)",
        orderBy: "name",
        pageSize: 100,
      });
      return NextResponse.json({ folders: res.data.files ?? [] });
    }

    // ── Folder info ───────────────────────────────────────────────────────────
    if (action === "folder-info" && folderId) {
      if (!decoded.roles.includes("ADMIN")) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      const res = await drive.files.get({ fileId: folderId, fields: "id,name,parents" });
      return NextResponse.json({ folder: res.data });
    }

    // ── Export a file as HTML ─────────────────────────────────────────────────
    if (action === "export" && fileId) {
      let html = "";
      try {
        const exported = await drive.files.export({ fileId, mimeType: "text/html" });
        html = exported.data as string;
      } catch {
        const raw = await drive.files.get({ fileId, alt: "media" }, { responseType: "text" });
        html = raw.data as string;
      }
      return NextResponse.json({ html });
    }

    // ── List files in configured root folder ─────────────────────────────────
    const rootId = folderId ?? getConfiguredFolderId();
    if (!rootId) {
      return NextResponse.json({ error: "No Drive folder configured. Set one in Admin → Settings." }, { status: 503 });
    }
    const res = await drive.files.list({
      q: `'${rootId}' in parents and trashed=false`,
      fields: "files(id,name,mimeType,modifiedTime,webViewLink,size)",
      orderBy: "modifiedTime desc",
      pageSize: 50,
    });
    return NextResponse.json({ files: res.data.files ?? [] });
  } catch (err: any) {
    console.error("Drive GET error:", err.message);
    return NextResponse.json({ error: err.message ?? "Drive error" }, { status: 500 });
  }
}

/** POST /api/drive  — backup a content document to Drive
 *  Body: { documentId }
 *  Returns: { driveFileId, driveFileUrl } */
export async function POST(req: Request) {
  try {
    const token = getTokenFromRequest(req);
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const decoded = verifyToken(token);
    if (!decoded) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { documentId } = await req.json();
    if (!documentId) return NextResponse.json({ error: "documentId required" }, { status: 400 });

    // Resolve root folder from settings (or env fallback)
    const rootFolderId = getConfiguredFolderId();
    if (!rootFolderId) {
      return NextResponse.json(
        { error: "No Drive folder configured. Set one in Admin → Settings." },
        { status: 503 }
      );
    }

    const doc = await (prisma as any).contentDocument.findUnique({
      where: { id: documentId },
      include: { topic: true },
    });
    if (!doc) return NextResponse.json({ error: "Document not found" }, { status: 404 });

    // Verify access: author or admin
    const isAdmin = decoded.roles.includes("ADMIN");
    if (!isAdmin && doc.authorId !== decoded.userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const drive = getDriveClient();
    const year  = doc.topic?.year ?? new Date().getFullYear();
    const book  = doc.topic?.bookNumber;

    // Folder hierarchy: Root → Year → Book N (or "Unassigned")
    const yearFolder = await findOrCreateFolder(drive, String(year), rootFolderId);
    const bookLabel  = book ? `Book ${book}` : "Unassigned";
    const bookFolder = await findOrCreateFolder(drive, bookLabel, yearFolder);

    // HTML wrapper with metadata header
    const htmlContent = `<!DOCTYPE html><html><head><meta charset="utf-8">
<title>${doc.title}</title></head><body>
<h1>${doc.title}</h1>
<p><em>Topic: ${doc.topic?.title ?? ""} · Status: ${doc.status} · Version: ${doc.version}</em></p>
<hr>
${doc.body}
</body></html>`;

    const fileName = `${doc.title}.html`;
    const mimeType = "text/html";

    let fileId   = doc.driveFileId;
    let fileUrl  = doc.driveFileUrl;

    if (fileId) {
      // Update existing file
      await drive.files.update({
        fileId,
        requestBody: { name: fileName },
        media: { mimeType, body: htmlContent },
      });
    } else {
      // Create new file
      const created = await drive.files.create({
        requestBody: { name: fileName, parents: [bookFolder], mimeType },
        media: { mimeType, body: htmlContent },
        fields: "id,webViewLink",
      });
      fileId  = created.data.id ?? null;
      fileUrl = created.data.webViewLink ?? null;
    }

    // Persist Drive IDs back to the document
    await (prisma as any).contentDocument.update({
      where: { id: documentId },
      data: { driveFileId: fileId, driveFileUrl: fileUrl },
    });

    return NextResponse.json({ driveFileId: fileId, driveFileUrl: fileUrl });
  } catch (err: any) {
    console.error("Drive POST error:", err.message);
    return NextResponse.json({ error: err.message ?? "Drive error" }, { status: 500 });
  }
}
