import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function parseJwt(token: string) {
  try {
    const base64Payload = token.split(".")[1];
    return JSON.parse(atob(base64Payload));
  } catch {
    return null;
  }
}

export async function POST(req: Request) {
  try {
    const token = req.headers.get("cookie")?.match(/token=([^;]+)/)?.[1];
    if (!token)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const decoded = parseJwt(token);
    if (!decoded || !decoded.roles.includes("ADMIN"))
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { userId, managerId } = await req.json();

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        managerId: managerId || null,
      },
    });

    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error("Update user error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}