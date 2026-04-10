import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken, getTokenFromRequest, hasModule } from "@/lib/auth";

// All system permissions — these are the canonical list
export const ALL_PERMISSIONS = [
  { name: "manage_users",       label: "Manage Users",        description: "Create, edit, deactivate users and assign managers" },
  { name: "manage_schools",     label: "Manage Schools",       description: "Create, edit schools and reassign between reps" },
  { name: "view_financial",     label: "View Financial",       description: "Access financial overview, payments, and dues" },
  { name: "export_data",        label: "Export Data",          description: "Export orders to Google Sheets / CSV" },
  { name: "import_data",        label: "Import Data",          description: "Import orders and schools via CSV" },
  { name: "view_audit_log",     label: "View Audit Log",       description: "View full action trail across the system" },
  { name: "view_metrics",       label: "View System Metrics",  description: "Access API health and database metrics" },
  { name: "approve_orders",     label: "Approve Orders",       description: "Approve or reject pending orders" },
  { name: "create_orders",      label: "Create Orders",        description: "Submit new orders for approval" },
  { name: "set_targets",        label: "Set Targets",          description: "Set monthly revenue and order targets for reps" },
  { name: "view_all_orders",    label: "View All Orders",      description: "View orders from all team members" },
  { name: "view_returns",       label: "View Returns",         description: "View returns management overview" },
  { name: "manage_permissions", label: "Manage Permissions",   description: "Assign or revoke permissions from roles" },
];

export async function GET(req: Request) {
  try {
    const token = getTokenFromRequest(req);
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const decoded = verifyToken(token);
    if (!decoded || !hasModule(decoded, "USER_MANAGEMENT"))
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    // Ensure all permissions exist in the DB
    for (const perm of ALL_PERMISSIONS) {
      await prisma.permission.upsert({
        where: { name: perm.name },
        update: {},
        create: { name: perm.name },
      });
    }

    // Fetch all roles with their current permissions
    const roles = await prisma.role.findMany({
      include: {
        permissions: {
          include: { permission: { select: { name: true } } },
        },
      },
      orderBy: { name: "asc" },
    });

    const roleMap = roles.map((role) => ({
      id:          role.id,
      name:        role.name,
      permissions: role.permissions.map((rp) => rp.permission.name),
    }));

    return NextResponse.json({ permissions: ALL_PERMISSIONS, roles: roleMap });
  } catch (err) {
    console.error("Permissions GET error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const token = getTokenFromRequest(req);
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const decoded = verifyToken(token);
    if (!decoded || !hasModule(decoded, "USER_MANAGEMENT"))
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    // Body: { roleName: string, permissions: string[] }
    const { roleName, permissions } = await req.json();
    if (!roleName || !Array.isArray(permissions))
      return NextResponse.json({ error: "roleName and permissions[] required" }, { status: 400 });

    // Get or create the role
    const role = await prisma.role.upsert({
      where: { name: roleName },
      update: {},
      create: { name: roleName },
    });

    // Resolve permission IDs
    const permRecords = await prisma.permission.findMany({
      where: { name: { in: permissions } },
    });

    // Replace all role permissions atomically
    await prisma.$transaction([
      prisma.rolePermission.deleteMany({ where: { roleId: role.id } }),
      prisma.rolePermission.createMany({
        data: permRecords.map((p) => ({ roleId: role.id, permissionId: p.id })),
        skipDuplicates: true,
      }),
    ]);

    await prisma.auditLog.create({
      data: {
        action:         "UPDATE_ROLE_PERMISSIONS",
        entity:         "Role",
        entityId:       role.id,
        userId:         decoded.userId,
        organizationId: decoded.organizationId,
        metadata:       { roleName, permissions },
      },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Permissions POST error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
