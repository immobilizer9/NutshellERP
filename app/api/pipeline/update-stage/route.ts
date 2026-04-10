import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken, getTokenFromRequest, hasModule } from "@/lib/auth";

const VALID_STAGES = [
  "LEAD", "CONTACTED", "VISITED",
  "PROPOSAL_SENT", "NEGOTIATION",
  "CLOSED_WON", "CLOSED_LOST",
];

export async function POST(req: Request) {
  try {
    const token = getTokenFromRequest(req);
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const decoded = verifyToken(token);
    if (!decoded) return NextResponse.json({ error: "Invalid token" }, { status: 401 });

    const { schoolId, stage } = await req.json();

    if (!schoolId || !stage) {
      return NextResponse.json({ error: "schoolId and stage are required" }, { status: 400 });
    }

    if (!VALID_STAGES.includes(stage)) {
      return NextResponse.json(
        { error: `Invalid stage. Must be one of: ${VALID_STAGES.join(", ")}` },
        { status: 400 }
      );
    }

    // Fetch the school to check ownership
    const school = await prisma.school.findUnique({
      where: { id: schoolId },
      select: { assignedToId: true },
    });

    if (!school) {
      return NextResponse.json({ error: "School not found" }, { status: 404 });
    }

    // ✅ SALES can only update stages for schools assigned to them
    if (hasModule(decoded, "PIPELINE") && !hasModule(decoded, "TEAM_MANAGEMENT")) {
      if (school.assignedToId !== decoded.userId) {
        return NextResponse.json(
          { error: "You can only update stages for schools assigned to you" },
          { status: 403 }
        );
      }
    }

    // ✅ BD_HEAD can only update stages for their team's schools
    if (hasModule(decoded, "TEAM_MANAGEMENT") && !hasModule(decoded, "USER_MANAGEMENT")) {
      const team = await prisma.user.findMany({
        where: { managerId: decoded.userId },
        select: { id: true },
      });
      const teamIds = [decoded.userId, ...team.map((u) => u.id)];
      if (school.assignedToId && !teamIds.includes(school.assignedToId)) {
        return NextResponse.json({ error: "Not allowed" }, { status: 403 });
      }
    }

    const updated = await prisma.school.update({
      where: { id: schoolId },
      data:  { pipelineStage: stage },
    });

    return NextResponse.json({ success: true, school: updated });
  } catch (error) {
    console.error("Stage update error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}