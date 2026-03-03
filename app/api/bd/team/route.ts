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

export async function GET(req: Request) {
  const token = req.headers.get("cookie")?.match(/token=([^;]+)/)?.[1];
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const decoded = parseJwt(token);
  if (!decoded || !decoded.roles.includes("BD_HEAD"))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const team = await prisma.user.findMany({
    where: {
      managerId: decoded.userId,
    },
  });

  return NextResponse.json(team);
}