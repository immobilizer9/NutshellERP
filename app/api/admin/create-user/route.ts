// app/api/admin/create-user/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcrypt";
import { verifyToken, getTokenFromRequest, hasModule } from "@/lib/auth";
import { createUserSchema, validateBody } from "@/lib/validate";
import { checkRateLimit } from "@/lib/rateLimit";
import { writeAuditLog } from "@/lib/auditLog";

const ALL_ROLES = ["ADMIN", "BD_HEAD", "SALES", "CONTENT_TEAM", "TRAINER", "DESIGN_TEAM"];

export async function POST(req: Request) {
  try {
    // Rate limit: 20 user creates per hour per admin
    const ip = (req.headers as any).get?.("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    const rl  = checkRateLimit(`create-user:${ip}`, 20, 60 * 60 * 1000);
    if (!rl.allowed) {
      return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 });
    }

    const token = getTokenFromRequest(req);
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const decoded = verifyToken(token);
    if (!decoded || !hasModule(decoded, "USER_MANAGEMENT")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const rawBody = await req.json();
    const validErr = validateBody(createUserSchema, rawBody);
    if (validErr) return validErr;
    const { name, email, password, roles, managerId, phone } = rawBody;

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

    writeAuditLog({
      action:         "USER_CREATED",
      entity:         "User",
      entityId:       newUser.id,
      userId:         decoded.userId,
      organizationId: decoded.organizationId,
      metadata:       { email: newUser.email, roles },
    });

    return NextResponse.json({ message: "User created successfully", userId: newUser.id });
  } catch (error) {
    console.error("Create user error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
