// app/api/admin/create-user/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcrypt";
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

    const { name, email, password, roles, managerId, phone } = await req.json();

    if (!name || !email || !password || !roles || !Array.isArray(roles) || roles.length === 0) {
      return NextResponse.json({ error: "name, email, password, and at least one role are required" }, { status: 400 });
    }

    const invalidRoles = roles.filter((r: string) => !ALL_ROLES.includes(r));
    if (invalidRoles.length > 0) {
      return NextResponse.json({ error: `Invalid roles: ${invalidRoles.join(", ")}` }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: "A user with this email already exists" }, { status: 400 });
    }

    const hashed = await bcrypt.hash(password, 10);

    const newUser = await prisma.user.create({
      data: {
        name,
        email,
        password:       hashed,
        phone:          phone || null,
        organizationId: decoded.organizationId,
        managerId:      roles.includes("SALES") && managerId ? managerId : null,
      },
    });

    // Assign all selected roles
    for (const roleName of roles) {
      let roleRecord = await prisma.role.findUnique({ where: { name: roleName } });
      if (!roleRecord) roleRecord = await prisma.role.create({ data: { name: roleName } });
      await prisma.userRole.create({ data: { userId: newUser.id, roleId: roleRecord.id } });
    }

    return NextResponse.json({ message: "User created successfully", userId: newUser.id });
  } catch (error) {
    console.error("Create user error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
