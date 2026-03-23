import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken, getTokenFromRequest } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const token = getTokenFromRequest(req);
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const decoded = verifyToken(token);
    if (!decoded) return NextResponse.json({ error: "Invalid token" }, { status: 401 });

    const { ids, all } = await req.json();

    let result;
    if (all) {
      result = await (prisma as any).notification.updateMany({
        where: { userId: decoded.userId, isRead: false },
        data: { isRead: true },
      });
    } else if (Array.isArray(ids) && ids.length > 0) {
      result = await (prisma as any).notification.updateMany({
        where: { id: { in: ids }, userId: decoded.userId },
        data: { isRead: true },
      });
    } else {
      return NextResponse.json({ error: "ids or all required" }, { status: 400 });
    }

    return NextResponse.json({ success: true, updated: result.count });
  } catch (err) {
    console.error("Mark read error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
