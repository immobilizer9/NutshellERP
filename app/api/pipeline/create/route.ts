import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken, getTokenFromRequest } from "@/lib/auth";
import { writeAuditLog } from "@/lib/auditLog";

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

    const body = await req.json();

    const {
      // Option A: use an existing school
      schoolId,

      // Option B: create a new school inline
      name,
      address,
      city,
      state,
      contactPerson,
      contactPhone,
      latitude,
      longitude,

      // Pipeline config
      pipelineStage = "LEAD",

      // Who to assign — SALES users always get themselves
      // BD/Admin can assign to a specific sales rep
      assignedToId,
    } = body;

    if (!VALID_STAGES.includes(pipelineStage)) {
      return NextResponse.json({ error: `Invalid stage` }, { status: 400 });
    }

    // ── Determine assigned user ─────────────────────────────────
    let finalAssignedToId: string;

    if (decoded.roles.includes("SALES")) {
      // Sales always assigns to themselves — can't reassign
      finalAssignedToId = decoded.userId;

    } else if (decoded.roles.includes("BD_HEAD")) {
      // BD can assign to themselves or any of their team members
      if (assignedToId && assignedToId !== decoded.userId) {
        // Verify the target is a direct report
        const targetUser = await prisma.user.findUnique({
          where: { id: assignedToId },
          select: { managerId: true },
        });
        if (targetUser?.managerId !== decoded.userId) {
          return NextResponse.json(
            { error: "You can only assign pipelines to your own team members" },
            { status: 403 }
          );
        }
      }
      finalAssignedToId = assignedToId ?? decoded.userId;

    } else {
      // ADMIN — can assign to anyone, defaults to themselves
      finalAssignedToId = assignedToId ?? decoded.userId;
    }

    let school: any;

    if (schoolId) {
      // ── Use existing school ───────────────────────────────────
      school = await prisma.school.findUnique({ where: { id: schoolId } });
      if (!school) {
        return NextResponse.json({ error: "School not found" }, { status: 404 });
      }

      // Update the assignment and stage
      school = await prisma.school.update({
        where: { id: schoolId },
        data: {
          pipelineStage,
          assignedToId: finalAssignedToId,
        },
        include: {
          assignedTo: { select: { id: true, name: true } },
        },
      });

    } else {
      // ── Create new school ─────────────────────────────────────
      if (!name || !city || !state) {
        return NextResponse.json(
          { error: "name, city, and state are required when creating a new school" },
          { status: 400 }
        );
      }

      school = await prisma.school.create({
        data: {
          name:          name.trim(),
          address:       address?.trim() ?? "",
          city:          city.trim(),
          state:         state.trim(),
          latitude:      latitude  ?? 0,
          longitude:     longitude ?? 0,
          contactPerson: contactPerson ?? null,
          contactPhone:  contactPhone  ?? null,
          pipelineStage,
          assignedToId:  finalAssignedToId,
        },
        include: {
          assignedTo: { select: { id: true, name: true } },
        },
      });
    }

    await writeAuditLog({
      action:         schoolId ? "PIPELINE_UPDATED" : "PIPELINE_CREATED",
      entity:         "School",
      entityId:       school.id,
      userId:         decoded.userId,
      organizationId: decoded.organizationId,
      metadata: { schoolName: school.name, stage: pipelineStage, assignedToId: finalAssignedToId },
    });

    return NextResponse.json(school);
  } catch (error) {
    console.error("Pipeline create error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}