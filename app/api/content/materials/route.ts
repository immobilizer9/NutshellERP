import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken, getTokenFromRequest, hasModule } from "@/lib/auth";

export async function GET(req: Request) {
  try {
    const token = getTokenFromRequest(req);
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const decoded = verifyToken(token);
    if (!decoded) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const materials = await prisma.trainingMaterial.findMany({
      where: { organizationId: decoded.organizationId },
      include: {
        createdBy: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(materials);
  } catch (error) {
    console.error("Materials GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const token = getTokenFromRequest(req);
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const decoded = verifyToken(token);
    if (!decoded) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const isAdmin = hasModule(decoded, "USER_MANAGEMENT");
    const isContentTeam = hasModule(decoded, "CONTENT_CREATE");

    if (!isAdmin && !isContentTeam) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { title, description, type, url, topic } = body;

    if (!title || !type || !topic) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const material = await prisma.trainingMaterial.create({
      data: {
        title,
        description: description ?? null,
        type,
        url: url ?? null,
        topic,
        createdById: decoded.userId,
        organizationId: decoded.organizationId,
      },
      include: {
        createdBy: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json(material, { status: 201 });
  } catch (error) {
    console.error("Materials POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
