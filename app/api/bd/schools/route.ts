import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken, getTokenFromRequest } from "@/lib/auth";

export async function GET(req: Request) {
  try {
    const token = getTokenFromRequest(req);

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const decoded = verifyToken(token);

    if (!decoded) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    // ✅ Any authenticated user can list schools (SALES needs this for order creation)
    const schools = await prisma.school.findMany({
      orderBy: { name: "asc" },
      include: {
        assignedTo: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json(schools);
  } catch (error) {
    console.error("Schools fetch error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const token = getTokenFromRequest(req);

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const decoded = verifyToken(token);

    // ✅ Only BD_HEAD or ADMIN can create schools
    if (!decoded || (!decoded.roles.includes("BD_HEAD") && !decoded.roles.includes("ADMIN"))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { name, address, city, state, latitude, longitude, contactPerson, contactPhone } = body;

    if (!name || !address || !city || !state) {
      return NextResponse.json(
        { error: "name, address, city, and state are required" },
        { status: 400 }
      );
    }

    const school = await prisma.school.create({
      data: {
        name,
        address,
        city,
        state,
        latitude: latitude ?? 0,
        longitude: longitude ?? 0,
        contactPerson: contactPerson ?? null,
        contactPhone: contactPhone ?? null,
      },
    });

    return NextResponse.json(school);
  } catch (error) {
    console.error("School create error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}