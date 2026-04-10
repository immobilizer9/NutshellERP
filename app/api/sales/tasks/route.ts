import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken, getTokenFromRequest, hasModule } from "@/lib/auth";

export async function GET(req: Request) {
  try {
    const token = getTokenFromRequest(req);

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const decoded = verifyToken(token);

    if (!decoded || !hasModule(decoded, "TASKS")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const tasks = await prisma.task.findMany({
      where: { assignedToId: decoded.userId },
      orderBy: { dueDate: "asc" },
    });

    return NextResponse.json(tasks);
  } catch (error) {
    console.error("Fetch tasks error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}