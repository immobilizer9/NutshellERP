import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function parseJwt(token: string) {
  try {
    const base64Payload = token.split(".")[1];
    const payload = atob(base64Payload);
    return JSON.parse(payload);
  } catch {
    return null;
  }
}

export async function POST(req: Request) {
  try {
    const token = req.headers.get("cookie")?.match(/token=([^;]+)/)?.[1];
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const decoded = parseJwt(token);
    if (!decoded || !decoded.roles.includes("SALES"))
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { taskId } = await req.json();

    const task = await prisma.task.findUnique({ where: { id: taskId } });

    if (!task || task.assignedToId !== decoded.userId)
      return NextResponse.json({ error: "Not allowed" }, { status: 403 });

    const updated = await prisma.task.update({
      where: { id: taskId },
      data: { status: "COMPLETED" },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Complete task error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}