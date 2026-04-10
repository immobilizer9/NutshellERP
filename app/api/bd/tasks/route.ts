import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken, getTokenFromRequest, hasModule } from "@/lib/auth";
import { sendTaskEmail } from "@/lib/sendTaskEmail";

export async function POST(req: Request) {
  try {
    const token = getTokenFromRequest(req);
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const decoded = verifyToken(token);
    const isAdmin  = hasModule(decoded, "USER_MANAGEMENT");
    const isBdHead = hasModule(decoded, "TEAM_MANAGEMENT");
    if (!decoded || (!isAdmin && !isBdHead)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { title, description, dueDate, assignedToId, priority } = await req.json();

    if (!title || !dueDate || !assignedToId) {
      return NextResponse.json(
        { error: "title, dueDate, and assignedToId are required" },
        { status: 400 }
      );
    }

    // Verify assigned user is a direct report of this BD Head (admins can assign to anyone)
    const salesUser = await prisma.user.findUnique({
      where:  { id: assignedToId },
      select: { managerId: true, name: true, email: true },
    });

    if (!salesUser) {
      return NextResponse.json({ error: "Assigned user not found" }, { status: 404 });
    }

    if (!isAdmin && salesUser.managerId !== decoded.userId) {
      return NextResponse.json(
        { error: "You can only assign tasks to your own team members" },
        { status: 403 }
      );
    }

    // Get BD Head's name for the email
    const bdUser = await prisma.user.findUnique({
      where:  { id: decoded.userId },
      select: { name: true },
    });

    const task = await prisma.task.create({
      data: {
        title,
        description: description ?? null,
        dueDate:     new Date(dueDate),
        assignedToId,
        assignedById: decoded.userId,
        priority:    ["LOW", "MEDIUM", "HIGH"].includes(priority) ? priority : "MEDIUM",
      },
      include: {
        assignedTo: { select: { id: true, name: true } },
      },
    });

    // ✅ Create in-app notification
    await (prisma as any).notification.create({
      data: {
        userId:         assignedToId,
        organizationId: decoded.organizationId,
        type:           "TASK_ASSIGNED",
        title:          "New Task Assigned",
        message:        `"${title}" — due ${new Date(dueDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}`,
        entityType:     "Task",
        entityId:       task.id,
      },
    });

    // ✅ Send email notification to the sales rep (non-blocking)
    if (salesUser.email) {
      sendTaskEmail({
        to:              salesUser.email,
        salesRepName:    salesUser.name,
        assignedByName:  bdUser?.name ?? "Your Manager",
        taskTitle:       title,
        taskDescription: description ?? undefined,
        dueDate:         new Date(dueDate).toLocaleDateString("en-IN", {
          day: "2-digit", month: "short", year: "numeric",
        }),
        dashboardUrl: process.env.APP_URL ? `${process.env.APP_URL}/sales` : undefined,
      }).catch((err) => console.error("Task email failed:", err));
    }

    return NextResponse.json(task);
  } catch (error) {
    console.error("Task create error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const token = getTokenFromRequest(req);
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const decoded = verifyToken(token);
    const isAdmin  = hasModule(decoded, "USER_MANAGEMENT");
    const isBdHead = hasModule(decoded, "TEAM_MANAGEMENT");
    if (!decoded || (!isAdmin && !isBdHead)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const team = isAdmin
      ? await prisma.user.findMany({
          where: { organizationId: decoded.organizationId, roles: { some: { role: { name: "SALES" } } } },
          select: { id: true },
        })
      : await prisma.user.findMany({
          where:  { managerId: decoded.userId },
          select: { id: true },
        });

    const tasks = await prisma.task.findMany({
      where:   { assignedToId: { in: team.map((u) => u.id) } },
      include: { assignedTo: { select: { id: true, name: true } } },
      orderBy: { dueDate: "asc" },
    });

    return NextResponse.json(tasks);
  } catch (error) {
    console.error("Tasks fetch error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}