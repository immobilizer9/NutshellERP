import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken, getTokenFromRequest, hasModule } from "@/lib/auth";
import bcrypt from "bcrypt";

/** POST /api/admin/reset-password — admin resets another user's password */
export async function POST(req: Request) {
  try {
    const token = getTokenFromRequest(req);
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const decoded = verifyToken(token);
    if (!decoded?.roles.includes("ADMIN")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { userId, newPassword } = await req.json();
    if (!userId || !newPassword) {
      return NextResponse.json({ error: "userId and newPassword are required" }, { status: 400 });
    }
    if (newPassword.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const hashed = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({ where: { id: userId }, data: { password: hashed } });

    await (prisma as any).auditLog.create({
      data: {
        action:         "RESET_PASSWORD",
        entity:         "User",
        entityId:       userId,
        userId:         decoded.userId,
        organizationId: decoded.organizationId,
        metadata:       { targetUser: user.email },
      },
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Reset password error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
