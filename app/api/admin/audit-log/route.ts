import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken, getTokenFromRequest, hasModule } from "@/lib/auth";

export async function GET(req: Request) {
  try {
    const token = getTokenFromRequest(req);
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const decoded = verifyToken(token);
    if (!decoded || !hasModule(decoded, "AUDIT_LOG")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const page   = Math.max(1, parseInt(searchParams.get("page")   ?? "1"));
    const limit  = Math.min(100, parseInt(searchParams.get("limit") ?? "50"));
    const action = searchParams.get("action") ?? undefined;
    const entity = searchParams.get("entity") ?? undefined;

    const where: any = { organizationId: decoded.organizationId };
    if (action) where.action = { contains: action, mode: "insensitive" };
    if (entity) where.entity = entity;

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip:  (page - 1) * limit,
        take:  limit,
      }),
      prisma.auditLog.count({ where }),
    ]);

    return NextResponse.json({
      logs,
      total,
      page,
      pages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("Audit log error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}