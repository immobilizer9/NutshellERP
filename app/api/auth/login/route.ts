import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rateLimit";
import { loginSchema } from "@/lib/validate";
import { writeAuditLog } from "@/lib/auditLog";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import crypto from "crypto";

const REFRESH_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export async function POST(req: Request) {
  try {
    // Rate limit: 10 attempts per 15 minutes per IP
    const ip =
      (req.headers as any).get?.("x-forwarded-for")?.split(",")[0]?.trim() ??
      "unknown";
    const rl = checkRateLimit(`login:${ip}`, 10, 15 * 60 * 1000);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Too many login attempts. Please try again later." },
        {
          status: 429,
          headers: {
            "Retry-After": String(rl.retryAfterSec),
            "X-RateLimit-Limit": "10",
            "X-RateLimit-Remaining": "0",
          },
        }
      );
    }

    const rawBody = await req.json();
    const parsed  = loginSchema.safeParse(rawBody);
    if (!parsed.success) {
      const msg = parsed.error.issues.map((e: any) => e.message).join("; ");
      return NextResponse.json({ error: msg }, { status: 400 });
    }
    const { email, password } = parsed.data;

    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        roles: {
          include: { role: true },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    if (!user.isActive) {
      return NextResponse.json({ error: "Account is inactive" }, { status: 403 });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const roles = user.roles.map((r) => r.role.name);

    // Fetch the union of all modules across all the user's roles
    const roleIds = user.roles.map((r) => r.roleId);
    const rolePermissions = await prisma.rolePermission.findMany({
      where:   { roleId: { in: roleIds } },
      include: { permission: { select: { name: true } } },
    });
    const modules = [...new Set(rolePermissions.map((rp) => rp.permission.name))];

    // Access token — 1 day until client-side auto-refresh is wired up
    const token = jwt.sign(
      { userId: user.id, organizationId: user.organizationId, roles, modules },
      process.env.JWT_SECRET!,
      { expiresIn: "1d" }
    );

    // Long-lived refresh token (7 days) — stored as SHA-256 hash in DB
    const rawRefresh  = crypto.randomBytes(48).toString("hex");
    const refreshHash = crypto.createHash("sha256").update(rawRefresh).digest("hex");
    await prisma.refreshToken.create({
      data: {
        userId:    user.id,
        tokenHash: refreshHash,
        expiresAt: new Date(Date.now() + REFRESH_TTL_MS),
      },
    });

    writeAuditLog({
      action:         "USER_LOGIN",
      entity:         "User",
      entityId:       user.id,
      userId:         user.id,
      userName:       user.name,
      organizationId: user.organizationId,
    });

    const response = NextResponse.json({ message: "Login successful", roles });

    response.cookies.set("token", token, {
      httpOnly: true,
      secure:   process.env.NODE_ENV === "production",
      sameSite: "lax",
      path:     "/",
      maxAge:   60 * 60 * 24, // 1 day
    });
    response.cookies.set("refreshToken", rawRefresh, {
      httpOnly: true,
      secure:   process.env.NODE_ENV === "production",
      sameSite: "lax",
      path:     "/api/auth/refresh",
      maxAge:   REFRESH_TTL_MS / 1000, // 7 days
    });

    return response;
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}