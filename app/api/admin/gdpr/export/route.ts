import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken, getTokenFromRequest, hasModule } from "@/lib/auth";
import { writeAuditLog } from "@/lib/auditLog";

/**
 * GET /api/admin/gdpr/export?userId=xxx
 * Returns a JSON bundle of all personal data for the given user.
 * Admin-only. Write to audit log.
 *
 * This satisfies GDPR Article 20 (right to data portability).
 */
export async function GET(req: Request) {
  try {
    const token = getTokenFromRequest(req);
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const decoded = verifyToken(token);
    if (!decoded || !hasModule(decoded, "USER_MANAGEMENT")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");
    if (!userId) return NextResponse.json({ error: "userId is required" }, { status: 400 });

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        roles:          { include: { role: { select: { name: true } } } },
        ordersCreated:  { select: { id: true, createdAt: true, status: true, netAmount: true, school: { select: { name: true } } } },
        visits:         { select: { id: true, createdAt: true, outcome: true, notes: true, school: { select: { name: true } } } },
        dailyReports:   { select: { id: true, createdAt: true, summary: true, location: true } },
        assignedTasks:  { select: { id: true, title: true, status: true, dueDate: true } },
        contentDocuments: { where: { deletedAt: null }, select: { id: true, title: true, status: true, createdAt: true } },
        notifications:  { select: { id: true, title: true, message: true, createdAt: true } },
      },
    });

    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    // Build export object — exclude password hash
    const exportData = {
      exportedAt:    new Date().toISOString(),
      exportedBy:    decoded.userId,
      profile: {
        id:        user.id,
        name:      user.name,
        email:     user.email,
        phone:     user.phone,
        isActive:  user.isActive,
        createdAt: user.createdAt,
      },
      roles:        user.roles.map((r) => r.role.name),
      orders:       user.ordersCreated,
      visits:       user.visits,
      dailyReports: user.dailyReports,
      tasks:        user.assignedTasks,
      documents:    user.contentDocuments,
      notifications:user.notifications,
    };

    writeAuditLog({
      action:         "GDPR_EXPORT",
      entity:         "User",
      entityId:       userId,
      userId:         decoded.userId,
      organizationId: decoded.organizationId,
      metadata:       { targetUserEmail: user.email },
    });

    return new Response(JSON.stringify(exportData, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="gdpr_export_${userId}_${Date.now()}.json"`,
      },
    });
  } catch (err) {
    console.error("GDPR export error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
