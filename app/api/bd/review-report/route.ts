import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken, getTokenFromRequest } from "@/lib/auth";

const VALID_STATUSES = ["PENDING", "APPROVED", "REJECTED"];

export async function POST(req: Request) {
  try {
    const token = getTokenFromRequest(req);

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const decoded = verifyToken(token);
    const isAdmin  = decoded?.roles.includes("ADMIN");
    const isBdHead = decoded?.roles.includes("BD_HEAD");

    if (!decoded || (!isAdmin && !isBdHead)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { reportId, status, comment } = await req.json();

    if (!reportId || !status) {
      return NextResponse.json(
        { error: "reportId and status are required" },
        { status: 400 }
      );
    }

    if (!VALID_STATUSES.includes(status)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}` },
        { status: 400 }
      );
    }

    // ✅ Verify the report belongs to this BD Head's team
    const report = await prisma.dailyReport.findUnique({
      where: { id: reportId },
      include: {
        salesUser: { select: { managerId: true } },
      },
    });

    if (!report) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    if (!isAdmin && report.salesUser.managerId !== decoded.userId) {
      return NextResponse.json({ error: "Not allowed" }, { status: 403 });
    }

    await prisma.dailyReport.update({
      where: { id: reportId },
      data: {
        status,
        bdComment: comment ?? null,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Review report error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}