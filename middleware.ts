import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

function parseJwt(token: string) {
  try {
    // JWT uses base64url — convert to standard base64 and add padding
    const b64url = token.split(".")[1];
    const b64 = b64url.replace(/-/g, "+").replace(/_/g, "/").padEnd(
      b64url.length + (4 - (b64url.length % 4)) % 4,
      "="
    );
    const payload = atob(b64);
    return JSON.parse(payload);
  } catch {
    return null;
  }
}

export function middleware(req: NextRequest) {
  const token = req.cookies.get("token")?.value;

  if (!token) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  const decoded = parseJwt(token);
  if (!decoded?.roles) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  const path = req.nextUrl.pathname;
  const roles: string[] = decoded.roles;

  // Admin-only routes
  if (path.startsWith("/dashboard") && !roles.includes("ADMIN")) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  if (path.startsWith("/admin") && !roles.includes("ADMIN")) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  if (path.startsWith("/settings") && !roles.includes("ADMIN")) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  // BD routes
  if (path.startsWith("/bd") && !roles.includes("BD_HEAD") && !roles.includes("ADMIN")) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  // Sales routes
  if (path.startsWith("/sales") && !roles.includes("SALES") && !roles.includes("ADMIN")) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  // Trainer routes
  if (path.startsWith("/trainer") && !roles.includes("TRAINER") && !roles.includes("ADMIN")) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  // Content routes
  if (path.startsWith("/content")) {
    const sessionPaths = path.startsWith("/content/quiz-sessions") || path.startsWith("/content/training-sessions");
    const workspacePath = path.startsWith("/content/workspace");
    const canAccess =
      roles.includes("CONTENT_TEAM") ||
      roles.includes("ADMIN") ||
      (sessionPaths && (roles.includes("TRAINER") || roles.includes("SALES") || roles.includes("BD_HEAD"))) ||
      (workspacePath && roles.includes("TRAINER"));
    if (!canAccess) return NextResponse.redirect(new URL("/", req.url));
  }

  // Design routes
  if (path.startsWith("/design") && !roles.includes("DESIGN_TEAM") && !roles.includes("ADMIN")) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  // Events routes
  const eventsRoles = ["ADMIN", "BD_HEAD", "SALES"];
  if (path.startsWith("/events") && !roles.some((r) => eventsRoles.includes(r))) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  // Shared module routes: TARGETS, TASKS, DAILY_REPORTS
  // Accessible by ADMIN, BD_HEAD, and SALES
  const sharedModuleRoles = ["ADMIN", "BD_HEAD", "SALES"];
  if (path.startsWith("/targets") && !roles.some((r) => sharedModuleRoles.includes(r))) {
    return NextResponse.redirect(new URL("/", req.url));
  }
  if (path.startsWith("/tasks") && !roles.some((r) => sharedModuleRoles.includes(r))) {
    return NextResponse.redirect(new URL("/", req.url));
  }
  if (path.startsWith("/reports") && !roles.some((r) => sharedModuleRoles.includes(r))) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/bd/:path*",
    "/sales/:path*",
    "/trainer/:path*",
    "/content/:path*",
    "/design/:path*",
    "/orders/:path*",
    "/pipeline/:path*",
    "/analytics/:path*",
    "/notifications/:path*",
    "/search/:path*",
    "/admin/:path*",
    "/targets/:path*",
    "/tasks/:path*",
    "/reports/:path*",
    "/events/:path*",
    "/settings/:path*",
    "/settings",
  ],
};
