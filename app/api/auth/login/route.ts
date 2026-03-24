import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rateLimit";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

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

    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

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

    // ✅ Secret comes from environment — never hardcoded
    const token = jwt.sign(
      {
        userId: user.id,
        organizationId: user.organizationId,
        roles,
      },
      process.env.JWT_SECRET!,
      { expiresIn: "1d" }
    );

    const response = NextResponse.json({
      message: "Login successful",
      roles,
    });

    response.cookies.set("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
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