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
    // BD/Admin can pass ?salesPersonId=xxx to filter by a specific sales rep
    const salesPersonId = searchParams.get("salesPersonId");

    let where: any = {};

    if (decoded.roles.includes("SALES")) {
      // ✅ Sales users only see schools assigned to them
      where = { assignedToId: decoded.userId };

    } else if (decoded.roles.includes("BD_HEAD")) {
      // BD sees schools assigned to their team members
      const team = await prisma.user.findMany({
        where: { managerId: decoded.userId },
        select: { id: true },
      });
      const teamIds = team.map((u) => u.id);

      if (salesPersonId && teamIds.includes(salesPersonId)) {
        // Filtered to a specific team member
        where = { assignedToId: salesPersonId };
      } else {
        // All team members
        where = { assignedToId: { in: teamIds } };
      }

    } else if (decoded.roles.includes("ADMIN")) {
      // Admin sees everything, optionally filtered
      if (salesPersonId) {
        where = { assignedToId: salesPersonId };
      }
      // else where = {} — all schools
    }

    const schools = await prisma.school.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        visits: {
          orderBy: { createdAt: "desc" },
          take: 1,
          include: {
            salesUser: { select: { id: true, name: true } },
          },
        },
        orders: {
          select: { netAmount: true, status: true },
        },
        assignedTo: {
          select: { id: true, name: true },
        },
      },
    });

    return NextResponse.json(schools);
  } catch (error) {
    console.error("Pipeline fetch error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}