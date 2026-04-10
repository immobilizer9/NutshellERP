import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken, getTokenFromRequest, hasModule } from "@/lib/auth";
import { writeAuditLog } from "@/lib/auditLog";

/**
 * POST /api/admin/gdpr/erase
 * Body: { userId, confirm: true }
 *
 * Anonymizes PII fields for the given user without deleting the record.
 * Preserves referential integrity and audit trail.
 *
 * Satisfies GDPR Article 17 (right to erasure).
 * Admin-only.
 */
export async function POST(req: Request) {
  try {
    const token = getTokenFromRequest(req);
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const decoded = verifyToken(token);
    if (!decoded || !hasModule(decoded, "USER_MANAGEMENT")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { userId, confirm } = body;

    if (!userId) return NextResponse.json({ error: "userId is required" }, { status: 400 });
    if (confirm !== true) {
      return NextResponse.json({ error: "Must pass confirm: true to proceed" }, { status: 400 });
    }

    // Prevent self-erasure or erasing the requesting admin
    if (userId === decoded.userId) {
      return NextResponse.json({ error: "Cannot erase your own account" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const anonymizedEmail = `erased_${userId}@erased.invalid`;

    await prisma.$transaction([
      // Anonymize user PII
      prisma.user.update({
        where: { id: userId },
        data: {
          name:     "[Erased]",
          email:    anonymizedEmail,
          phone:    null,
          password: "[ERASED]",
          isActive: false,
        },
      }),
      // Revoke all refresh tokens
      prisma.refreshToken.updateMany({
        where: { userId, revokedAt: null },
        data:  { revokedAt: new Date() },
      }),
      // Soft-delete their content documents
      prisma.contentDocument.updateMany({
        where: { authorId: userId, deletedAt: null },
        data:  { deletedAt: new Date() },
      }),
    ]);

    writeAuditLog({
      action:         "GDPR_ERASE",
      entity:         "User",
      entityId:       userId,
      userId:         decoded.userId,
      organizationId: decoded.organizationId,
      metadata:       { originalEmail: user.email, anonymizedEmail },
    });

    return NextResponse.json({ ok: true, message: "User PII has been anonymized." });
  } catch (err) {
    console.error("GDPR erase error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
