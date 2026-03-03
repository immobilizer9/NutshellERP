import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ message: "Role-based order visibility API working" });
}
