import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/health
 * Returns 200 if the server and DB are reachable, 503 otherwise.
 * Used by uptime monitors and load-balancer health checks.
 */
export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json(
      { status: "ok", db: "connected", timestamp: new Date().toISOString() },
      { status: 200 }
    );
  } catch (err: any) {
    return NextResponse.json(
      { status: "error", db: "unreachable", error: err?.message },
      { status: 503 }
    );
  }
}
