import { NextResponse } from "next/server";
import { google } from "googleapis";
import { verifyToken, getTokenFromRequest } from "@/lib/auth";
import crypto from "crypto";
import fs from "fs";
import path from "path";

const SETTINGS_PATH = path.join(process.cwd(), "config", "settings.json");

function readSettings() {
  try {
    if (fs.existsSync(SETTINGS_PATH)) return JSON.parse(fs.readFileSync(SETTINGS_PATH, "utf-8"));
  } catch { /* ignore */ }
  return {};
}

function writeSettings(data: any) {
  if (!fs.existsSync(path.dirname(SETTINGS_PATH)))
    fs.mkdirSync(path.dirname(SETTINGS_PATH), { recursive: true });
  fs.writeFileSync(SETTINGS_PATH, JSON.stringify(data, null, 2), "utf-8");
}

/** GET /api/drive/auth  — redirect admin to Google OAuth consent screen */
export async function GET(req: Request) {
  const token = getTokenFromRequest(req);
  if (!token) return NextResponse.redirect(new URL("/", req.url));

  const decoded = verifyToken(token);
  if (!decoded?.roles.includes("ADMIN")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    return NextResponse.json(
      { error: "GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be set in environment" },
      { status: 503 }
    );
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const state  = crypto.randomBytes(20).toString("hex");

  // Store state for CSRF check in callback
  const settings = readSettings();
  settings._oauthState = state;
  writeSettings(settings);

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${appUrl}/api/drive/callback`
  );

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: "offline",
    prompt:       "consent",   // always return refresh_token
    scope:        ["https://www.googleapis.com/auth/drive"],
    state,
  });

  return NextResponse.redirect(authUrl);
}

/** DELETE /api/drive/auth  — disconnect (remove tokens) */
export async function DELETE(req: Request) {
  const token = getTokenFromRequest(req);
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const decoded = verifyToken(token);
  if (!decoded?.roles.includes("ADMIN")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const settings = readSettings();
  delete settings.driveOAuthRefreshToken;
  delete settings.driveOAuthAccessToken;
  delete settings.driveOAuthExpiry;
  delete settings.driveConnectedEmail;
  writeSettings(settings);

  return NextResponse.json({ success: true });
}
