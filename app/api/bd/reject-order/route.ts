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

  const { orderId } = await req.json();

  if (!orderId)
    return NextResponse.json({ error: "Order ID required" }, { status: 400 });

  await prisma.order.update({
    where: { id: orderId },
    data: {
      status: "REJECTED",
    },
  });

  return NextResponse.json({ success: true });
}