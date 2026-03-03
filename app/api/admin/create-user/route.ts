import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

export async function POST(req: Request) {
  try {
    const { name, email, password, role, managerId } = await req.json();

    if (!name || !email || !password || !role) {
      return NextResponse.json(
        { error: "All fields are required" },
        { status: 400 }
      );
    }

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "User already exists" },
        { status: 400 }
      );
    }

    const adminUser = await prisma.user.findFirst({
      where: { email: "admin@quizzora.com" },
    });

    if (!adminUser) {
      return NextResponse.json(
        { error: "Admin not found" },
        { status: 400 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await prisma.user.create({
  data: {
    name,
    email,
    password: hashedPassword,
    organizationId: adminUser.organizationId,
    managerId: role === "SALES" && managerId ? managerId : null,
  },
});

    let roleRecord = await prisma.role.findUnique({
      where: { name: role },
    });

    if (!roleRecord) {
      roleRecord = await prisma.role.create({
        data: { name: role },
      });
    }

    await prisma.userRole.create({
      data: {
        userId: newUser.id,
        roleId: roleRecord.id,
      },
    });

    return NextResponse.json({
      message: "User created successfully",
    });
  } catch (error) {
    console.error("Create user error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}