import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

export async function POST(req: Request) {
  // Revoke refresh token if present
  const rawRefresh = req.headers.get("cookie")?.match(/refreshToken=([^;]+)/)?.[1];
  if (rawRefresh) {
    const tokenHash = crypto.createHash("sha256").update(rawRefresh).digest("hex");
    await prisma.refreshToken.updateMany({
      where: { tokenHash, revokedAt: null },
      data:  { revokedAt: new Date() },
    }).catch(() => { /* logout must always succeed */ });
  }

  const response = NextResponse.json({ message: "Logged out" });
  response.cookies.set("token", "", {
    httpOnly: true, secure: process.env.NODE_ENV === "production",
    sameSite: "lax", path: "/", maxAge: 0,
  });
  response.cookies.set("refreshToken", "", {
    httpOnly: true, secure: process.env.NODE_ENV === "production",
    sameSite: "lax", path: "/api/auth/refresh", maxAge: 0,
  });
  return response;
}
