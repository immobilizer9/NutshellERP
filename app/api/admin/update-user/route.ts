// app/api/admin/update-user/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken, getTokenFromRequest } from "@/lib/auth";

const ALL_ROLES = ["ADMIN", "BD_HEAD", "SALES", "CONTENT_TEAM", "TRAINER", "DESIGN_TEAM"];

export async function POST(req: Request) {
  try {
    const token = getTokenFromRequest(req);
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const decoded = verifyToken(token);
    if (!decoded || !decoded.roles.includes("ADMIN")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { userId, managerId, phone, isActive, name, roles } = await req.json();

    if (!userId) return NextResponse.json({ error: "userId is required" }, { status: 400 });

    const target = await prisma.user.findUnique({ where: { id: userId } });
    if (!target || target.organizationId !== decoded.organizationId) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const updateData: any = {};
    if (managerId !== undefined) updateData.managerId = managerId || null;
    if (phone     !== undefined) updateData.phone     = phone || null;
    if (isActive  !== undefined) updateData.isActive  = Boolean(isActive);
    if (name      !== undefined && name.trim()) updateData.name = name.trim();

    const updated = await prisma.user.update({ where: { id: userId }, data: updateData });

    // Multi-role update: replace all existing roles with new set
    if (Array.isArray(roles) && roles.length > 0) {
      const validRoles = roles.filter((r: string) => ALL_ROLES.includes(r));
      if (validRoles.length > 0) {
        await prisma.userRole.deleteMany({ where: { userId } });
        for (const roleName of validRoles) {
          const roleRecord = await prisma.role.findFirst({ where: { name: roleName } });
          if (roleRecord) {
            await prisma.userRole.create({ data: { userId, roleId: roleRecord.id } });
          }
        }
      }
    }

    const { password: _, ...safe } = updated;
    return NextResponse.json(safe);
  } catch (error) {
    console.error("Update user error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
