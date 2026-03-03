import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ message: "Revenue analytics refinement API working" });
}
