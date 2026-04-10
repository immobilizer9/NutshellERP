import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken, getTokenFromRequest, hasModule } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const token = getTokenFromRequest(req);
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const decoded = verifyToken(token);
    if (!decoded || !hasModule(decoded, "SCHOOLS")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { schoolId, assignedToId } = await req.json();
    if (!schoolId) return NextResponse.json({ error: "schoolId is required" }, { status: 400 });

    const school = await prisma.school.update({
      where: { id: schoolId },
      data: { assignedToId: assignedToId ?? null },
      include: { assignedTo: { select: { id: true, name: true } } },
    });

    return NextResponse.json(school);
  } catch (err) {
    console.error("School reassign error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
