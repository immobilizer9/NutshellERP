import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken, getTokenFromRequest } from "@/lib/auth";
import fs from "fs";
import path from "path";

const SETTINGS_PATH = path.join(process.cwd(), "config", "settings.json");

function readSettings() {
  try {
    if (!fs.existsSync(SETTINGS_PATH)) return getDefaults();
    return { ...getDefaults(), ...JSON.parse(fs.readFileSync(SETTINGS_PATH, "utf-8")) };
  } catch {
    return getDefaults();
  }
}

function getDefaults() {
  return {
    visitAlertDays:              30,
    deliveryAlertDays:           7,
    emailOnOrderApproval:        true,
    emailOnOrderRejection:       true,
    emailOnTaskAssignment:       true,
    emailOnOverdueTask:          false,
    defaultPipelineStage:        "LEAD",
    defaultPaymentStatus:        "UNPAID",
    driveFolderId:               "",
    driveFolderName:             "",
  };
}

function writeSettings(data: any) {
  if (!fs.existsSync(path.dirname(SETTINGS_PATH))) {
    fs.mkdirSync(path.dirname(SETTINGS_PATH), { recursive: true });
  }
  fs.writeFileSync(SETTINGS_PATH, JSON.stringify(data, null, 2), "utf-8");
}

export async function GET(req: Request) {
  try {
    const token = getTokenFromRequest(req);
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const decoded = verifyToken(token);
    if (!decoded || !decoded.roles.includes("ADMIN"))
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const org = await prisma.organization.findUnique({
      where: { id: decoded.organizationId },
      select: { name: true },
    });

    return NextResponse.json({ settings: readSettings(), orgName: org?.name ?? "" });
  } catch (err) {
    console.error("Settings GET error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const token = getTokenFromRequest(req);
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const decoded = verifyToken(token);
    if (!decoded || !decoded.roles.includes("ADMIN"))
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = await req.json();

    // Validate numeric thresholds
    const visitDays    = parseInt(body.visitAlertDays);
    const deliveryDays = parseInt(body.deliveryAlertDays);
    if (isNaN(visitDays) || visitDays < 1 || visitDays > 365)
      return NextResponse.json({ error: "visitAlertDays must be between 1–365" }, { status: 400 });
    if (isNaN(deliveryDays) || deliveryDays < 1 || deliveryDays > 90)
      return NextResponse.json({ error: "deliveryAlertDays must be between 1–90" }, { status: 400 });

    const existing = readSettings();
    const updated  = {
      ...existing,
      visitAlertDays:        visitDays,
      deliveryAlertDays:     deliveryDays,
      emailOnOrderApproval:  !!body.emailOnOrderApproval,
      emailOnOrderRejection: !!body.emailOnOrderRejection,
      emailOnTaskAssignment: !!body.emailOnTaskAssignment,
      emailOnOverdueTask:    !!body.emailOnOverdueTask,
      // Drive folder (optional — only update if provided)
      ...(body.driveFolderId   !== undefined && { driveFolderId:   body.driveFolderId   ?? "" }),
      ...(body.driveFolderName !== undefined && { driveFolderName: body.driveFolderName ?? "" }),
    };

    writeSettings(updated);

    await prisma.auditLog.create({
      data: {
        action:         "UPDATE_SETTINGS",
        entity:         "Settings",
        userId:         decoded.userId,
        organizationId: decoded.organizationId,
        metadata:       updated,
      },
    });

    return NextResponse.json({ success: true, settings: updated });
  } catch (err) {
    console.error("Settings PUT error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
