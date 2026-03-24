import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken, getTokenFromRequest } from "@/lib/auth";

export async function PATCH(req: Request) {
  try {
    const token = getTokenFromRequest(req);
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const decoded = verifyToken(token);
    if (!decoded) return NextResponse.json({ error: "Invalid token" }, { status: 401 });

    const { name, phone } = await req.json();

    const update: { name?: string; phone?: string } = {};
    if (name?.trim())  update.name  = name.trim();
    if (phone !== undefined) update.phone = phone?.trim() || null;

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
    }

    const user = await prisma.user.update({
      where:  { id: decoded.userId },
      data:   update,
      select: { id: true, name: true, email: true, phone: true },
    });

    return NextResponse.json(user);
  } catch (error) {
    console.error("Update profile error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
