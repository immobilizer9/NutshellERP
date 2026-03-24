import { NextResponse } from "next/server";
import { google } from "googleapis";
import { prisma } from "@/lib/prisma";
import { verifyToken, getTokenFromRequest } from "@/lib/auth";

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

const ROOT_FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID ?? "";

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

/** GET /api/drive?action=list[&folderId=xxx]  — list Drive files in a folder
 *  GET /api/drive?action=export&fileId=xxx    — export Google Doc as HTML */
export async function GET(req: Request) {
  try {
    const token = getTokenFromRequest(req);
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const decoded = verifyToken(token);
    if (!decoded) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    if (!ROOT_FOLDER_ID) {
      return NextResponse.json({ error: "GOOGLE_DRIVE_FOLDER_ID not configured" }, { status: 503 });
    }

    const { searchParams } = new URL(req.url);
    const action   = searchParams.get("action") ?? "list";
    const folderId = searchParams.get("folderId") ?? ROOT_FOLDER_ID;
    const fileId   = searchParams.get("fileId");

    const drive = getDriveClient();

    if (action === "export" && fileId) {
      // Export Google Doc as HTML
      let html = "";
      try {
        const exported = await drive.files.export({ fileId, mimeType: "text/html" });
        html = exported.data as string;
      } catch {
        // Not a Google Doc — try downloading directly
        const raw = await drive.files.get({ fileId, alt: "media" }, { responseType: "text" });
        html = raw.data as string;
      }
      return NextResponse.json({ html });
    }

    // List files
    const res = await drive.files.list({
      q: `'${folderId}' in parents and trashed=false`,
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

    if (!ROOT_FOLDER_ID) {
      return NextResponse.json({ error: "GOOGLE_DRIVE_FOLDER_ID not configured" }, { status: 503 });
    }

    const { documentId } = await req.json();
    if (!documentId) return NextResponse.json({ error: "documentId required" }, { status: 400 });

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

    // Folder: Root → Year → Book N (or "Unassigned")
    const yearFolder = await findOrCreateFolder(drive, String(year), ROOT_FOLDER_ID);
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
