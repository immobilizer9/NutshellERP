import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken, getTokenFromRequest } from "@/lib/auth";

// GET /api/visit-alerts
// Returns schools that haven't been visited in 30+ days (or never visited)
// SALES: only their assigned schools
// BD_HEAD: all schools assigned to their team
// ADMIN: all schools
export async function GET(req: Request) {
  try {
    const token = getTokenFromRequest(req);
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const decoded = verifyToken(token);
    if (!decoded) return NextResponse.json({ error: "Invalid token" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const daysParam = searchParams.get("days");
    const threshold = parseInt(daysParam ?? "30");

    let schoolWhere: any = {};

    if (decoded.roles.includes("SALES")) {
      schoolWhere.assignedToId = decoded.userId;
    } else if (decoded.roles.includes("BD_HEAD")) {
      const team = await prisma.user.findMany({
        where:  { managerId: decoded.userId },
        select: { id: true },
      });
      const teamIds = [decoded.userId, ...team.map((u) => u.id)];
      schoolWhere.assignedToId = { in: teamIds };
    }
    // ADMIN: no filter = all schools

    const schools = await prisma.school.findMany({
      where: schoolWhere,
      include: {
        visits:     { orderBy: { createdAt: "desc" }, take: 1 },
        assignedTo: { select: { id: true, name: true } },
      },
    });

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - threshold);

    const alerts = schools
      .filter((s) => {
        const lastVisit = s.visits[0]?.createdAt ?? null;
        return !lastVisit || lastVisit < cutoff;
      })
      .map((s) => {
        const lastVisit = s.visits[0]?.createdAt ?? null;
        const daysAgo   = lastVisit
          ? Math.floor((Date.now() - new Date(lastVisit).getTime()) / (1000 * 60 * 60 * 24))
          : null;
        return {
          id:           s.id,
          name:         s.name,
          city:         s.city,
          assignedTo:   s.assignedTo,
          pipelineStage: s.pipelineStage,
          lastVisit,
          daysAgo,
          neverVisited: !lastVisit,
        };
      })
      .sort((a, b) => {
        // Never visited first, then most overdue
        if (a.neverVisited !== b.neverVisited) return a.neverVisited ? -1 : 1;
        return (b.daysAgo ?? 0) - (a.daysAgo ?? 0);
      });

    return NextResponse.json(alerts);
  } catch (err) {
    console.error("Visit alerts GET error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
