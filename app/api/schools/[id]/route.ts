import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken, getTokenFromRequest } from "@/lib/auth";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const token = getTokenFromRequest(req);
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const decoded = verifyToken(token);
    if (!decoded) return NextResponse.json({ error: "Invalid token" }, { status: 401 });

    const { id } = await params;

    const school = await prisma.school.findUnique({
      where: { id },
      include: {
        assignedTo: { select: { id: true, name: true, email: true, phone: true } },
        orders: {
          orderBy: { createdAt: "desc" },
          include: {
            createdBy: { select: { id: true, name: true } },
            items:     true,
          },
        },
        visits: {
          orderBy: { createdAt: "desc" },
          take: 20,
          include: {
            salesUser: { select: { id: true, name: true } },
          },
        },
        events: {
          orderBy: { date: "desc" },
          take: 20,
          include: {
            createdBy: { select: { id: true, name: true } },
          },
        },
      },
    });

    if (!school) return NextResponse.json({ error: "School not found" }, { status: 404 });

    // SALES: can only see their assigned schools
    if (decoded.roles.includes("SALES") && school.assignedToId !== decoded.userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json(school);
  } catch (err) {
    console.error("School GET error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
