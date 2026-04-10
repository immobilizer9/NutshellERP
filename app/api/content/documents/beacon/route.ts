import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Beacon endpoint — called on page unload via navigator.sendBeacon()
// No strict auth requirement; just needs a valid documentId
export async function POST(req: Request) {
  try {
    const contentType = req.headers.get("content-type") ?? "";

    let documentId: string | null = null;
    let title: string | undefined;
    let body: string | undefined;

    if (contentType.includes("multipart/form-data")) {
      const form = await req.formData();
      documentId = form.get("documentId") as string | null;
      title      = (form.get("title") as string | null) ?? undefined;
      body       = (form.get("body")  as string | null) ?? undefined;
    } else if (contentType.includes("application/x-www-form-urlencoded")) {
      const text = await req.text();
      const params = new URLSearchParams(text);
      documentId = params.get("documentId");
      title      = params.get("title") ?? undefined;
      body       = params.get("body")  ?? undefined;
    } else {
      // Also accept JSON (keepalive fetch)
      const json = await req.json();
      documentId = json.documentId ?? null;
      title      = json.title;
      body       = json.body;
    }

    if (!documentId) {
      return new Response("", { status: 200 });
    }

    const update: any = {};
    if (title !== undefined) update.title = title;
    if (body  !== undefined) update.body  = body;

    if (Object.keys(update).length > 0) {
      await prisma.contentDocument.update({ where: { id: documentId }, data: update });
    }

    return new Response("", { status: 200 });
  } catch (error) {
    console.error("[beacon] error:", error);
    return new Response("", { status: 200 });
  }
}
