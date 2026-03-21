import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken, getTokenFromRequest } from "@/lib/auth";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const token = getTokenFromRequest(req);
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const decoded = verifyToken(token);
    if (!decoded) return NextResponse.json({ error: "Invalid token" }, { status: 401 });

    const { id } = await context.params;

    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        school: true,
        createdBy: { select: { id: true, name: true, email: true } },
        items: true,
        returns: { include: { item: true } },
        pocs: true,
      },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const isAdminOrBD =
      decoded.roles.includes("ADMIN") || decoded.roles.includes("BD_HEAD");

    if (!isAdminOrBD && order.createdById !== decoded.userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json(order);
  } catch (error) {
    console.error("Order fetch error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}