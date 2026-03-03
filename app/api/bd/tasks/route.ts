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
    if (!decoded || !decoded.roles.includes("BD_HEAD"))
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { title, description, dueDate, assignedToId } = await req.json();
if (!assignedToId) {
  return NextResponse.json(
    { error: "Please select a sales user" },
    { status: 400 }
  );
}
    // Verify assigned user belongs to BD
    const salesUser = await prisma.user.findUnique({
      where: { id: assignedToId },
    });

    if (salesUser?.managerId !== decoded.userId) {
      return NextResponse.json({ error: "Not allowed" }, { status: 403 });
    }

    const task = await prisma.task.create({
      data: {
        title,
        description,
        dueDate: new Date(dueDate),
        assignedToId,
        assignedById: decoded.userId,
      },
    });

    return NextResponse.json(task);
  } catch (error) {
    console.error("Task creation error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}