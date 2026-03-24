import { NextResponse } from "next/server";
import { google } from "googleapis";
import { prisma } from "@/lib/prisma";
import { verifyToken, getTokenFromRequest } from "@/lib/auth";
import fs from "fs";
import path from "path";

const SETTINGS_PATH = path.join(process.cwd(), "config", "settings.json");

function readSettings() {
  try {
    if (fs.existsSync(SETTINGS_PATH)) return JSON.parse(fs.readFileSync(SETTINGS_PATH, "utf-8"));
  } catch { /* ignore */ }
  return {};
}

function writeSettings(data: any) {
  if (!fs.existsSync(path.dirname(SETTINGS_PATH)))
    fs.mkdirSync(path.dirname(SETTINGS_PATH), { recursive: true });
  fs.writeFileSync(SETTINGS_PATH, JSON.stringify(data, null, 2), "utf-8");
}

/** Build an authenticated Drive client from stored OAuth2 tokens */
function getDriveClient() {
  const s = readSettings();

  if (!s.driveOAuthRefreshToken) {
    throw new Error("Google Drive not connected. Go to Admin → Settings and click Connect Google Drive.");
  }

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/api/drive/callback`
  );

  oauth2Client.setCredentials({
    refresh_token: s.driveOAuthRefreshToken,
    access_token:  s.driveOAuthAccessToken  ?? undefined,
    expiry_date:   s.driveOAuthExpiry        ?? undefined,
  });

  // Persist refreshed tokens automatically
  oauth2Client.on("tokens", (tokens) => {
    const current = readSettings();
    if (tokens.refresh_token) current.driveOAuthRefreshToken = tokens.refresh_token;
    if (tokens.access_token)  current.driveOAuthAccessToken  = tokens.access_token;
    if (tokens.expiry_date)   current.driveOAuthExpiry        = tokens.expiry_date;
    writeSettings(current);
  });

  return google.drive({ version: "v3", auth: oauth2Client });
}

/** Read the configured root folder ID */
function getConfiguredFolderId(): string {
  try {
    const s = readSettings();
    if (s.driveFolderId) return s.driveFolderId;
  } catch { /* ignore */ }
  return process.env.GOOGLE_DRIVE_FOLDER_ID ?? "";
}

/** Find or create a sub-folder by name inside parentId */
async function findOrCreateFolder(drive: any, name: string, parentId: string): Promise<string> {
  const safeName = name.replace(/'/g, "\\'");
  const res = await drive.files.list({
    q: `name='${safeName}' and mimeType='application/vnd.google-apps.folder' and '${parentId}' in parents and trashed=false`,
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
 * GET /api/drive?action=list[&folderId=xxx]          — list files in a folder
 * GET /api/drive?action=export&fileId=xxx            — export Google Doc as HTML
 * GET /api/drive?action=folders[&parentId=xxx]       — browse folders (ADMIN only)
 * GET /api/drive?action=status                       — OAuth connection status (ADMIN only)
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

    // ── OAuth status (no Drive client needed) ────────────────────────────────
    if (action === "status") {
      if (!decoded.roles.includes("ADMIN"))
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      const s = readSettings();
      return NextResponse.json({
        connected:     !!s.driveOAuthRefreshToken,
        email:         s.driveConnectedEmail ?? null,
        folderId:      s.driveFolderId      ?? null,
        folderName:    s.driveFolderName    ?? null,
      });
    }

    const drive = getDriveClient();

    // ── Folder browsing (ADMIN only) ─────────────────────────────────────────
    if (action === "folders") {
      if (!decoded.roles.includes("ADMIN"))
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });

      const q = parentId
        ? `mimeType='application/vnd.google-apps.folder' and '${parentId}' in parents and trashed=false`
        : `mimeType='application/vnd.google-apps.folder' and 'root' in parents and trashed=false`;

      const res = await drive.files.list({
        q,
        fields:   "files(id,name,modifiedTime)",
        orderBy:  "name",
        pageSize: 200,
      });
      return NextResponse.json({ folders: res.data.files ?? [] });
    }

    // ── Export a file as HTML ────────────────────────────────────────────────
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

    // ── List files in a folder ───────────────────────────────────────────────
    const rootId = folderId ?? getConfiguredFolderId();
    if (!rootId) {
      return NextResponse.json(
        { error: "No folder selected. Go to Admin → Settings and choose a Drive folder." },
        { status: 503 }
      );
    }
    const res = await drive.files.list({
      q:        `'${rootId}' in parents and trashed=false`,
      fields:   "files(id,name,mimeType,modifiedTime,webViewLink,size)",
      orderBy:  "modifiedTime desc",
      pageSize: 50,
    });
    return NextResponse.json({ files: res.data.files ?? [] });
  } catch (err: any) {
    console.error("Drive GET error:", err.message);
    return NextResponse.json({ error: err.message ?? "Drive error" }, { status: 500 });
  }
}

/** POST /api/drive  — back up a content document to Drive */
export async function POST(req: Request) {
  try {
    const token = getTokenFromRequest(req);
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const decoded = verifyToken(token);
    if (!decoded) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { documentId } = await req.json();
    if (!documentId) return NextResponse.json({ error: "documentId required" }, { status: 400 });

    const rootFolderId = getConfiguredFolderId();
    if (!rootFolderId) {
      return NextResponse.json(
        { error: "No folder selected. Go to Admin → Settings and choose a Drive folder." },
        { status: 503 }
      );
    }

    const doc = await (prisma as any).contentDocument.findUnique({
      where:   { id: documentId },
      include: { topic: true },
    });
    if (!doc) return NextResponse.json({ error: "Document not found" }, { status: 404 });

    const isAdmin = decoded.roles.includes("ADMIN");
    if (!isAdmin && doc.authorId !== decoded.userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const drive    = getDriveClient();
    const year     = doc.topic?.year       ?? new Date().getFullYear();
    const book     = doc.topic?.bookNumber;
    const yearFolder = await findOrCreateFolder(drive, String(year), rootFolderId);
    const bookLabel  = book ? `Book ${book}` : "Unassigned";
    const bookFolder = await findOrCreateFolder(drive, bookLabel, yearFolder);

    const htmlContent = `<!DOCTYPE html><html><head><meta charset="utf-8">
<title>${doc.title}</title></head><body>
<h1>${doc.title}</h1>
<p><em>Topic: ${doc.topic?.title ?? ""} · Status: ${doc.status} · Version: ${doc.version}</em></p>
<hr>
${doc.body}
</body></html>`;

    const fileName = `${doc.title}.html`;
    const mimeType = "text/html";

    let fileId  = doc.driveFileId;
    let fileUrl = doc.driveFileUrl;

    if (fileId) {
      await drive.files.update({
        fileId,
        requestBody: { name: fileName },
        media: { mimeType, body: htmlContent },
      });
    } else {
      const created = await drive.files.create({
        requestBody: { name: fileName, parents: [bookFolder], mimeType },
        media:       { mimeType, body: htmlContent },
        fields:      "id,webViewLink",
      });
      fileId  = created.data.id       ?? null;
      fileUrl = created.data.webViewLink ?? null;
    }

    await (prisma as any).contentDocument.update({
      where: { id: documentId },
      data:  { driveFileId: fileId, driveFileUrl: fileUrl },
    });

    return NextResponse.json({ driveFileId: fileId, driveFileUrl: fileUrl });
  } catch (err: any) {
    console.error("Drive POST error:", err.message);
    return NextResponse.json({ error: err.message ?? "Drive error" }, { status: 500 });
  }
}
