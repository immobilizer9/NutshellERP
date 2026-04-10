import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken, getTokenFromRequest, hasModule } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const token = getTokenFromRequest(req);

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const decoded = verifyToken(token);

    if (!decoded || !hasModule(decoded, "TASKS")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { taskId } = await req.json();

    if (!taskId) {
      return NextResponse.json({ error: "taskId is required" }, { status: 400 });
    }

    const task = await prisma.task.findUnique({ where: { id: taskId } });

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    // ✅ Sales user can only complete tasks assigned to them
    if (task.assignedToId !== decoded.userId) {
      return NextResponse.json({ error: "Not allowed" }, { status: 403 });
    }

    if (task.status === "COMPLETED") {
      return NextResponse.json(
        { error: "Task is already completed" },
        { status: 400 }
      );
    }

    const updated = await prisma.task.update({
      where: { id: taskId },
      data: { status: "COMPLETED" },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Complete task error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}