import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken, getTokenFromRequest, hasModule } from "@/lib/auth";

export async function GET(req: Request) {
  try {
    const token = getTokenFromRequest(req);

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const decoded = verifyToken(token);
    const isAdmin  = hasModule(decoded, "USER_MANAGEMENT");
    const isBdHead = hasModule(decoded, "TEAM_MANAGEMENT");

    if (!decoded || (!isAdmin && !isBdHead)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const team = await prisma.user.findMany({
      where: isAdmin
        ? { organizationId: decoded.organizationId, roles: { some: { role: { name: "SALES" } } } }
        : { managerId: decoded.userId },
      select: {
        id: true,
        name: true,
        email: true,
        isActive: true,
        createdAt: true,
        roles: {
          include: { role: true },
        },
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json(team);
  } catch (error) {
    console.error("Team fetch error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}