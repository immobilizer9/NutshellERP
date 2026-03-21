// app/api/admin/update-user/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken, getTokenFromRequest } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const token = getTokenFromRequest(req);
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const decoded = verifyToken(token);
    if (!decoded || !decoded.roles.includes("ADMIN")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { userId, managerId, phone } = await req.json();

    if (!userId) return NextResponse.json({ error: "userId is required" }, { status: 400 });

    const target = await prisma.user.findUnique({ where: { id: userId } });
    if (!target || target.organizationId !== decoded.organizationId) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const updateData: any = { managerId: managerId || null };
    if (phone !== undefined) updateData.phone = phone || null;   // ✅

    const updated = await prisma.user.update({ where: { id: userId }, data: updateData });

    const { password: _, ...safe } = updated;
    return NextResponse.json(safe);
  } catch (error) {
    console.error("Update user error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}