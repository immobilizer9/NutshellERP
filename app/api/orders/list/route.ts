import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken, getTokenFromRequest } from "@/lib/auth";

export async function GET(req: Request) {
  try {
    const token = getTokenFromRequest(req);

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const decoded = verifyToken(token);

    if (!decoded) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    // ✅ Role-based filtering:
    // ADMIN    → all orders
    // BD_HEAD  → orders created by their direct reports
    // SALES    → only their own orders
    let where: object = {};

    if (decoded.roles.includes("ADMIN")) {
      where = {};
    } else if (decoded.roles.includes("BD_HEAD")) {
      // Get IDs of all sales users reporting to this BD Head
      const team = await prisma.user.findMany({
        where: { managerId: decoded.userId },
        select: { id: true },
      });
      const teamIds = team.map((u) => u.id);
      where = { createdById: { in: teamIds } };
    } else {
      // SALES — own orders only
      where = { createdById: decoded.userId };
    }

    const orders = await prisma.order.findMany({
      where,
      include: {
        school: true,
        createdBy: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(orders);
  } catch (error) {
    console.error("Order list error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}