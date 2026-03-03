import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function parseJwt(token: string) {
  try {
    return JSON.parse(atob(token.split(".")[1]));
  } catch {
    return null;
  }
}

export async function POST(req: Request) {
  const token = req.headers.get("cookie")?.match(/token=([^;]+)/)?.[1];

  if (!token)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const decoded = parseJwt(token);

  if (!decoded || !decoded.roles.includes("BD_HEAD"))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { reportId, status, comment } = await req.json();

  await prisma.dailyReport.update({
    where: { id: reportId },
    data: {
      status,
      bdComment: comment || null,
    },
  });

  return NextResponse.json({ success: true });
}