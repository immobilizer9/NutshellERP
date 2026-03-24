import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken, getTokenFromRequest } from "@/lib/auth";

export async function GET(req: Request) {
  try {
    const token = getTokenFromRequest(req);
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const decoded = verifyToken(token);
    if (!decoded) return NextResponse.json({ error: "Invalid token" }, { status: 401 });

    const notifications = await (prisma as any).notification.findMany({
      where: { userId: decoded.userId },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    return NextResponse.json(notifications);
  } catch (err) {
    console.error("Notifications GET error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const token = getTokenFromRequest(req);
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const decoded = verifyToken(token);
    if (!decoded) return NextResponse.json({ error: "Invalid token" }, { status: 401 });

    const { userId, type, title, message, entityType, entityId } = await req.json();
    if (!userId || !type || !title || !message) {
      return NextResponse.json({ error: "userId, type, title, message required" }, { status: 400 });
    }

    // Only admins can create notifications for other users
    const isAdmin = decoded.roles.includes("ADMIN");
    if (!isAdmin && userId !== decoded.userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const notification = await (prisma as any).notification.create({
      data: {
        userId,
        organizationId: decoded.organizationId,
        type,
        title,
        message,
        entityType: entityType ?? null,
        entityId:   entityId   ?? null,
      },
    });
    return NextResponse.json(notification, { status: 201 });
  } catch (err) {
    console.error("Notifications POST error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
