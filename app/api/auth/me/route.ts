import { NextResponse } from "next/server";

function parseJwt(token: string) {
  try {
    return JSON.parse(atob(token.split(".")[1]));
  } catch {
    return null;
  }
}

export async function GET(req: Request) {
  const token = req.headers.get("cookie")?.match(/token=([^;]+)/)?.[1];

  if (!token) {
    return NextResponse.json({ user: null }, { status: 200 });
  }

  const decoded = parseJwt(token);

  if (!decoded) {
    return NextResponse.json({ user: null }, { status: 200 });
  }

  return NextResponse.json({ user: decoded });
}