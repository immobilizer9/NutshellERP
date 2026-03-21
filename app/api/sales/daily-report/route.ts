import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken, getTokenFromRequest } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const token = getTokenFromRequest(req);

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const decoded = verifyToken(token);

    if (!decoded || !decoded.roles.includes("SALES")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { summary, location, latitude, longitude } = await req.json();

    if (!summary) {
      return NextResponse.json(
        { error: "summary is required" },
        { status: 400 }
      );
    }

    // ✅ Uses shared prisma singleton — not new PrismaClient()
    const report = await prisma.dailyReport.create({
      data: {
        summary,
        location: location ?? null,
        latitude: latitude ?? null,
        longitude: longitude ?? null,
        salesUserId: decoded.userId,
      },
    });

    return NextResponse.json(report);
  } catch (error) {
    console.error("Daily report submit error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

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

    const reports = await prisma.dailyReport.findMany({
      where: { salesUserId: decoded.userId },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(reports);
  } catch (error) {
    console.error("Fetch reports error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}