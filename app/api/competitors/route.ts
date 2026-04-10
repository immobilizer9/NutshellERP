import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken, getTokenFromRequest, hasModule } from "@/lib/auth";

// GET /api/competitors?schoolId=...
export async function GET(req: Request) {
  try {
    const token = getTokenFromRequest(req);
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const decoded = verifyToken(token);
    if (!decoded) return NextResponse.json({ error: "Invalid token" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const schoolId = searchParams.get("schoolId");

    let where: any = {};
    if (schoolId) where.schoolId = schoolId;

    // SALES reps can only see notes for their assigned schools
    if (hasModule(decoded, "ORDERS") && !hasModule(decoded, "TEAM_MANAGEMENT")) {
      const mySchools = await prisma.school.findMany({
        where:  { assignedToId: decoded.userId },
        select: { id: true },
      });
      const mySchoolIds = mySchools.map((s) => s.id);
      if (schoolId) {
        if (!mySchoolIds.includes(schoolId)) {
          return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }
      } else {
        where.schoolId = { in: mySchoolIds };
      }
    }

    const notes = await (prisma as any).competitorNote.findMany({
      where,
      include: {
        school:    { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(notes);
  } catch (err) {
    console.error("Competitors GET error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/competitors
// Body: { schoolId, competitor, notes, isActive }
export async function POST(req: Request) {
  try {
    const token = getTokenFromRequest(req);
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const decoded = verifyToken(token);
    if (!decoded) return NextResponse.json({ error: "Invalid token" }, { status: 401 });

    const { schoolId, competitor, notes, isActive } = await req.json();
    if (!schoolId || !competitor) {
      return NextResponse.json({ error: "schoolId and competitor are required" }, { status: 400 });
    }

    const note = await (prisma as any).competitorNote.create({
      data: {
        schoolId,
        createdById: decoded.userId,
        competitor:  competitor.trim(),
        notes:       notes   ?? null,
        isActive:    isActive ?? true,
      },
      include: {
        school:    { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json(note, { status: 201 });
  } catch (err) {
    console.error("Competitors POST error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE /api/competitors?id=...
export async function DELETE(req: Request) {
  try {
    const token = getTokenFromRequest(req);
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const decoded = verifyToken(token);
    if (!decoded) return NextResponse.json({ error: "Invalid token" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

    const existing = await (prisma as any).competitorNote.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const isAdmin = hasModule(decoded, "USER_MANAGEMENT");
    const isBD    = hasModule(decoded, "TEAM_MANAGEMENT");
    if (!isAdmin && !isBD && existing.createdById !== decoded.userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await (prisma as any).competitorNote.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Competitors DELETE error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
