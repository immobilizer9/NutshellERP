import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import crypto from "crypto";

const ACCESS_TTL_SEC  = 60 * 60;          // 1 hour
const REFRESH_TTL_MS  = 7 * 24 * 60 * 60 * 1000; // 7 days

/**
 * POST /api/auth/refresh
 * Reads the `refreshToken` httpOnly cookie, validates it against the DB,
 * rotates it (issues a new one), and sets a new short-lived access token.
 *
 * Rotation: old token is revoked immediately — replay attacks are detected.
 */
export async function POST(req: Request) {
  try {
    const rawToken = req.headers.get("cookie")?.match(/refreshToken=([^;]+)/)?.[1];
    if (!rawToken) {
      return NextResponse.json({ error: "No refresh token" }, { status: 401 });
    }

    // Hash the incoming token and look it up
    const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");

    const stored = await prisma.refreshToken.findUnique({ where: { tokenHash } });
    if (!stored || stored.revokedAt || new Date() > stored.expiresAt) {
      return NextResponse.json({ error: "Refresh token invalid or expired" }, { status: 401 });
    }

    // Revoke old token immediately (rotation)
    await prisma.refreshToken.update({
      where: { id: stored.id },
      data:  { revokedAt: new Date() },
    });

    // Load user + roles + modules
    const user = await prisma.user.findUnique({
      where:   { id: stored.userId },
      include: { roles: { include: { role: true } } },
    });
    if (!user || !user.isActive) {
      return NextResponse.json({ error: "User not found or inactive" }, { status: 401 });
    }

    const roles   = user.roles.map((r) => r.role.name);
    const roleIds = user.roles.map((r) => r.roleId);
    const rolePerms = await prisma.rolePermission.findMany({
      where:   { roleId: { in: roleIds } },
      include: { permission: { select: { name: true } } },
    });
    const modules = [...new Set(rolePerms.map((rp) => rp.permission.name))];

    // Issue new access token
    const accessToken = jwt.sign(
      { userId: user.id, organizationId: user.organizationId, roles, modules },
      process.env.JWT_SECRET!,
      { expiresIn: ACCESS_TTL_SEC }
    );

    // Issue new refresh token (raw random, stored as sha256 hash)
    const newRaw  = crypto.randomBytes(48).toString("hex");
    const newHash = crypto.createHash("sha256").update(newRaw).digest("hex");
    await prisma.refreshToken.create({
      data: {
        userId:    user.id,
        tokenHash: newHash,
        expiresAt: new Date(Date.now() + REFRESH_TTL_MS),
      },
    });

    const response = NextResponse.json({ ok: true });

    response.cookies.set("token", accessToken, {
      httpOnly: true,
      secure:   process.env.NODE_ENV === "production",
      sameSite: "lax",
      path:     "/",
      maxAge:   ACCESS_TTL_SEC,
    });
    response.cookies.set("refreshToken", newRaw, {
      httpOnly: true,
      secure:   process.env.NODE_ENV === "production",
      sameSite: "lax",
      path:     "/api/auth/refresh",
      maxAge:   REFRESH_TTL_MS / 1000,
    });

    return response;
  } catch (err) {
    console.error("Token refresh error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
