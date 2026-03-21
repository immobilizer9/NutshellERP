// app/api/admin/create-user/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcrypt";
import { verifyToken, getTokenFromRequest } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const token = getTokenFromRequest(req);
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const decoded = verifyToken(token);
    if (!decoded || !decoded.roles.includes("ADMIN")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { name, email, password, role, managerId, phone } = await req.json();

    if (!name || !email || !password || !role) {
      return NextResponse.json({ error: "name, email, password, and role are required" }, { status: 400 });
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
        password:      hashed,
        phone:         phone || null,   // ✅
        organizationId: decoded.organizationId,
        managerId:     role === "SALES" && managerId ? managerId : null,
      },
    });

    let roleRecord = await prisma.role.findUnique({ where: { name: role } });
    if (!roleRecord) roleRecord = await prisma.role.create({ data: { name: role } });

    await prisma.userRole.create({ data: { userId: newUser.id, roleId: roleRecord.id } });

    return NextResponse.json({ message: "User created successfully", userId: newUser.id });
  } catch (error) {
    console.error("Create user error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}