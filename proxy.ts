import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

function parseJwt(token: string) {
  try {
    const base64Payload = token.split(".")[1];
    const payload = atob(base64Payload);
    return JSON.parse(payload);
  } catch {
    return null;
  }
}

export function proxy(req: NextRequest) {
  const token = req.cookies.get("token")?.value;

  if (!token) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  const decoded = parseJwt(token);

  if (!decoded) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  const path = req.nextUrl.pathname;

  if (path.startsWith("/dashboard") && !decoded.roles.includes("ADMIN")) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  if (path.startsWith("/sales") && !decoded.roles.includes("SALES")) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/sales/:path*"],
};
