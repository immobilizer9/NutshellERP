import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken, getTokenFromRequest } from "@/lib/auth";

export async function GET(req: Request) {
  try {
    const token = getTokenFromRequest(req);
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const decoded = verifyToken(token);
    if (!decoded) return NextResponse.json({ error: "Invalid token" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q")?.trim() ?? "";
    if (q.length < 2) return NextResponse.json({ schools: [], orders: [], users: [] });

    const isSales = decoded.roles.includes("SALES");
    const isBD    = decoded.roles.includes("BD_HEAD");

    // Team IDs for BD_HEAD
    let teamIds: string[] = [];
    if (isBD) {
      const team = await prisma.user.findMany({ where: { managerId: decoded.userId }, select: { id: true } });
      teamIds = [decoded.userId, ...team.map((u) => u.id)];
    }

    // Schools
    const schoolWhere: any = {
      OR: [
        { name: { contains: q, mode: "insensitive" } },
        { city: { contains: q, mode: "insensitive" } },
      ],
    };
    if (isSales) schoolWhere.assignedToId = decoded.userId;
    else if (isBD) schoolWhere.assignedToId = { in: teamIds };

    const schools = await prisma.school.findMany({
      where: schoolWhere,
      select: { id: true, name: true, city: true, state: true, pipelineStage: true, assignedTo: { select: { id: true, name: true } } },
      take: 5,
    });

    // Orders
    const orderWhere: any = {
      school: { name: { contains: q, mode: "insensitive" } },
    };
    if (isSales) orderWhere.createdById = decoded.userId;
    else if (isBD) orderWhere.createdById = { in: teamIds };

    const orders = await prisma.order.findMany({
      where: orderWhere,
      select: { id: true, status: true, netAmount: true, productType: true, createdAt: true, school: { select: { name: true } }, createdBy: { select: { name: true } } },
      take: 5,
      orderBy: { createdAt: "desc" },
    });

    // Users (ADMIN/BD_HEAD only)
    let users: any[] = [];
    if (!isSales) {
      const userWhere: any = {
        OR: [
          { name:  { contains: q, mode: "insensitive" } },
          { email: { contains: q, mode: "insensitive" } },
        ],
        organizationId: decoded.organizationId,
      };
      if (isBD) userWhere.managerId = decoded.userId;
      users = await prisma.user.findMany({
        where: userWhere,
        select: { id: true, name: true, email: true },
        take: 5,
      });
    }

    return NextResponse.json({ schools, orders, users });
  } catch (err) {
    console.error("Search error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
