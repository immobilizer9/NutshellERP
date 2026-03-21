import { NextResponse } from "next/server";
import { verifyToken, getTokenFromRequest } from "@/lib/auth";

export async function GET(req: Request) {
  const token = getTokenFromRequest(req);

  if (!token) {
    return NextResponse.json({ user: null }, { status: 200 });
  }

  // ✅ Verifies signature — forged tokens are rejected
  const decoded = verifyToken(token);

  if (!decoded) {
    return NextResponse.json({ user: null }, { status: 200 });
  }

  return NextResponse.json({ user: decoded });
}