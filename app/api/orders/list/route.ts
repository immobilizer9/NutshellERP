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

    if (!decoded) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const page   = Math.max(1, parseInt(searchParams.get("page")  ?? "1"));
    const limit  = Math.min(200, Math.max(1, parseInt(searchParams.get("limit") ?? "50")));
    const skip   = (page - 1) * limit;
    const status = searchParams.get("status");

    // ✅ Role-based filtering:
    // ADMIN    → all orders
    // BD_HEAD  → orders created by their direct reports
    // SALES    → only their own orders
    let where: any = { deletedAt: null };

    if (hasModule(decoded, "USER_MANAGEMENT")) {
      // admin sees all
    } else if (hasModule(decoded, "TEAM_MANAGEMENT")) {
      const team = await prisma.user.findMany({
        where: { managerId: decoded.userId },
        select: { id: true },
      });
      where.createdById = { in: team.map((u) => u.id) };
    } else {
      where.createdById = decoded.userId;
    }
    if (status) where.status = status;

    const [orders, total] = await prisma.$transaction([
      prisma.order.findMany({
        where,
        include: {
          school:    true,
          createdBy: { select: { id: true, name: true, email: true } },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.order.count({ where }),
    ]);

    return NextResponse.json({ orders, total, page, limit, pages: Math.ceil(total / limit) });
  } catch (error) {
    console.error("Order list error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}