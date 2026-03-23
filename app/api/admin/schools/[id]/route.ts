import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken, getTokenFromRequest } from "@/lib/auth";

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const token = getTokenFromRequest(req);
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const decoded = verifyToken(token);
    if (!decoded || !decoded.roles.includes("ADMIN")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { name, address, city, state, contactPerson, contactPhone, pipelineStage, assignedToId } =
      await req.json();

    const validStages = ["LEAD", "CONTACTED", "VISITED", "PROPOSAL_SENT", "NEGOTIATION", "CLOSED_WON", "CLOSED_LOST"];
    if (pipelineStage && !validStages.includes(pipelineStage)) {
      return NextResponse.json({ error: "Invalid pipelineStage" }, { status: 400 });
    }

    const data: any = {};
    if (name          !== undefined) data.name          = name;
    if (address       !== undefined) data.address       = address;
    if (city          !== undefined) data.city          = city;
    if (state         !== undefined) data.state         = state;
    if (contactPerson !== undefined) data.contactPerson = contactPerson;
    if (contactPhone  !== undefined) data.contactPhone  = contactPhone;
    if (pipelineStage !== undefined) data.pipelineStage = pipelineStage;
    if (assignedToId  !== undefined) data.assignedToId  = assignedToId || null;

    const school = await prisma.school.update({
      where: { id: params.id },
      data,
      include: { assignedTo: { select: { id: true, name: true } } },
    });

    return NextResponse.json(school);
  } catch (err) {
    console.error("School update error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
