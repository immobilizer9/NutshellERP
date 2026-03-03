import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function parseJwt(token: string) {
  try {
    return JSON.parse(atob(token.split(".")[1]));
  } catch {
    return null;
  }
}

export async function GET(req: Request) {
  const token = req.headers.get("cookie")?.match(/token=([^;]+)/)?.[1];

  if (!token)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const decoded = parseJwt(token);

  if (!decoded || !decoded.roles.includes("BD_HEAD"))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // 🔹 Fetch Team
  const team = await prisma.user.findMany({
    where: { managerId: decoded.userId },
  });

  const teamIds = team.map((u) => u.id);

  // 🔹 ORDERS
  const orders = await prisma.order.findMany({
    where: {
      createdById: { in: teamIds },
      status: "FINALIZED",
    },
  });

  const totalOrders = orders.length;
  const totalRevenue = orders
    .filter(o => o.status === "APPROVED")
    .reduce((sum, o) => sum + o.netAmount, 0);

  const pendingOrders = orders.filter(o => o.status === "PENDING");

  // 🔹 TASKS
  const tasks = await prisma.task.findMany({
    where: {
      assignedToId: { in: teamIds },
    },
    include: {
      assignedTo: true,
    },
  });

  const now = new Date();

  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.status === "COMPLETED").length;
  const pendingTasks = tasks.filter(t => t.status === "PENDING").length;
  const overdueTasks = tasks.filter(
    t => t.status !== "COMPLETED" && new Date(t.dueDate) < now
  ).length;

  const completionRate =
    totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);

  // 🔹 DAILY REPORTS
  const reports = await prisma.dailyReport.findMany({
    where: {
      salesUserId: { in: teamIds },
    },
    orderBy: {
      createdAt: "desc",
    },
    include: {
      salesUser: true,
    },
  });
  
// Inactive Sales
const salesActivityStatus = team.map((user) => {
  const latestReport = reports.find(
    (r) => r.salesUserId === user.id
  );

  const lastActivity = latestReport?.createdAt || null;

  const isInactive =
    !lastActivity ||
    new Date().getTime() - new Date(lastActivity).getTime() >
      24 * 60 * 60 * 1000;

  return {
    userId: user.id,
    name: user.name,
    lastActivity,
    isInactive,
  };
});
type TimelineItem = {
  type: "REPORT" | "ORDER" | "TASK";
  user: string | undefined;
  description: string;
  time: Date;
};

const timeline: TimelineItem[] = [];

// Reports
reports.forEach((report) => {
  timeline.push({
    type: "REPORT",
    user: report.salesUser.name,
    description: "Submitted daily report",
    time: report.createdAt,
  });
});

// Orders
orders.forEach((order) => {
  timeline.push({
    type: "ORDER",
    user: team.find(u => u.id === order.createdById)?.name,
    description: `Created order of ₹${order.netAmount}`,
    time: order.createdAt,
  });
});

// Task completions
tasks
  .filter(t => t.status === "COMPLETED")
  .forEach((task) => {
    timeline.push({
      type: "TASK",
      user: task.assignedTo.name,
      description: `Completed task: ${task.title}`,
      time: task.updatedAt,
    });
  });

// Sort newest first
timeline.sort(
  (a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()
);

  return NextResponse.json({
    // Orders
    totalOrders,
    totalRevenue,
    pendingOrders,

    // Tasks
    totalTasks,
    completedTasks,
    pendingTasks,
    overdueTasks,
    completionRate,
    tasks,

    // Reports
    reports,
    salesActivityStatus,
    timeline,
  });
}