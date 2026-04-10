import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken, getTokenFromRequest, hasModule } from "@/lib/auth";

export async function GET(req: Request) {
  try {
    const token = getTokenFromRequest(req);
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const decoded = verifyToken(token);
    if (!decoded || !hasModule(decoded, "SCHOOLS")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") ?? "";
    const limit  = parseInt(searchParams.get("limit")  ?? "50");
    const offset = parseInt(searchParams.get("offset") ?? "0");

    const where: any = {
      deletedAt: null,
      ...(search ? {
        OR: [
          { name:          { contains: search, mode: "insensitive" } },
          { city:          { contains: search, mode: "insensitive" } },
          { state:         { contains: search, mode: "insensitive" } },
          { contactPerson: { contains: search, mode: "insensitive" } },
        ],
      } : {}),
    };

    const [schools, total] = await Promise.all([
      prisma.school.findMany({
        where,
        skip: offset,
        take: limit,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          name: true,
          city: true,
          state: true,
          pipelineStage: true,
          contactPerson: true,
          contactPhone: true,
          createdAt: true,
          assignedTo: { select: { id: true, name: true } },
          _count: { select: { orders: true } },
        },
      }),
      prisma.school.count({ where }),
    ]);

    return NextResponse.json({ schools, total, limit, offset });
  } catch (err) {
    console.error("Schools list error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const token = getTokenFromRequest(req);
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const decoded = verifyToken(token);
    if (!decoded || !hasModule(decoded, "SCHOOLS")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = await req.json();
    const { name, address, city, state, contactPerson, contactPhone, latitude, longitude, assignedToId } = body;

    if (!name || !city || !state) {
      return NextResponse.json({ error: "name, city, and state are required" }, { status: 400 });
    }

    const school = await prisma.school.create({
      data: {
        name,
        address:       address       ?? null,
        city,
        state,
        contactPerson: contactPerson ?? null,
        contactPhone:  contactPhone  ?? null,
        latitude:      latitude      ?? null,
        longitude:     longitude     ?? null,
        assignedToId:  assignedToId  ?? null,
      },
      select: {
        id: true,
        name: true,
        city: true,
        state: true,
        pipelineStage: true,
        contactPerson: true,
        contactPhone: true,
        createdAt: true,
        assignedTo: { select: { id: true, name: true } },
        _count: { select: { orders: true } },
      },
    });

    return NextResponse.json(school, { status: 201 });
  } catch (err) {
    console.error("School create error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
