import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken, getTokenFromRequest, hasModule } from "@/lib/auth";

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
          where: { deletedAt: null },
          orderBy: { createdAt: "desc" },
          include: {
            createdBy: { select: { id: true, name: true } },
            items:     true,
            pocs:      true,
            returns:   true,
          },
        },
        visits: {
          orderBy: { createdAt: "desc" },
          take: 50,
          include: { salesUser: { select: { id: true, name: true } } },
        },
        events: {
          orderBy: { date: "desc" },
          take: 50,
          include: { createdBy: { select: { id: true, name: true } } },
        },
        competitorNotes: {
          orderBy: { createdAt: "desc" },
          include: { createdBy: { select: { id: true, name: true } } },
        },
        activities: {
          orderBy: { scheduledDate: "desc" },
          take: 50,
          include: { user: { select: { id: true, name: true } } },
        },
        quizSessions: {
          orderBy: { scheduledDate: "desc" },
          take: 20,
          include: { conductedBy: { select: { id: true, name: true } } },
        },
        trainingSessions: {
          orderBy: { scheduledDate: "desc" },
          take: 20,
          include: { conductedBy: { select: { id: true, name: true } } },
        },
      },
    });

    if (!school) return NextResponse.json({ error: "School not found" }, { status: 404 });

    // SALES: can only see their own assigned schools
    if (!hasModule(decoded, "TEAM_MANAGEMENT") && !hasModule(decoded, "USER_MANAGEMENT")) {
      if (school.assignedToId !== decoded.userId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    return NextResponse.json(school);
  } catch (err) {
    console.error("School GET error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
