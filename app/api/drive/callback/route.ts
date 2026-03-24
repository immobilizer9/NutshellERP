import { NextResponse } from "next/server";
import { google } from "googleapis";
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

/** GET /api/drive/callback  — OAuth2 redirect handler from Google */
export async function GET(req: Request) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const settingsUrl = `${appUrl}/settings`;

  const { searchParams } = new URL(req.url);
  const code  = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  if (error) {
    return NextResponse.redirect(`${settingsUrl}?drive_error=${encodeURIComponent(error)}`);
  }

  if (!code) {
    return NextResponse.redirect(`${settingsUrl}?drive_error=no_code`);
  }

  // Verify state (CSRF protection)
  const settings = readSettings();
  if (!state || state !== settings._oauthState) {
    return NextResponse.redirect(`${settingsUrl}?drive_error=invalid_state`);
  }

  try {
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      `${appUrl}/api/drive/callback`
    );

    // Exchange code for tokens
    const { tokens } = await oauth2Client.getToken(code);

    if (!tokens.refresh_token) {
      // No refresh token — this shouldn't happen with prompt=consent, but handle it
      return NextResponse.redirect(`${settingsUrl}?drive_error=no_refresh_token`);
    }

    // Fetch the connected Google account email
    oauth2Client.setCredentials(tokens);
    const oauth2    = google.oauth2({ version: "v2", auth: oauth2Client });
    const userInfo  = await oauth2.userinfo.get();
    const email     = userInfo.data.email ?? "unknown";

    // Persist tokens
    delete settings._oauthState;
    settings.driveOAuthRefreshToken = tokens.refresh_token;
    settings.driveOAuthAccessToken  = tokens.access_token  ?? null;
    settings.driveOAuthExpiry       = tokens.expiry_date   ?? null;
    settings.driveConnectedEmail    = email;
    writeSettings(settings);

    return NextResponse.redirect(`${settingsUrl}?drive_connected=1`);
  } catch (err: any) {
    console.error("Drive OAuth callback error:", err.message);
    return NextResponse.redirect(
      `${settingsUrl}?drive_error=${encodeURIComponent(err.message ?? "oauth_failed")}`
    );
  }
}
