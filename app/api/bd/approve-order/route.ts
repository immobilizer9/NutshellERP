import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function parseJwt(token: string) {
  try {
    const base64Payload = token.split(".")[1];
    const payload = atob(base64Payload);
    return JSON.parse(payload);
  } catch {
    return null;
  }
}

export async function POST(req: Request) {
  try {
    const token = req.headers.get("cookie")?.match(/token=([^;]+)/)?.[1];

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const decoded = parseJwt(token);

    if (!decoded || !decoded.roles.includes("BD_HEAD")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { orderId } = await req.json();

    const order = await prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Check if order belongs to BD's team
    const salesUser = await prisma.user.findUnique({
      where: { id: order.createdById },
    });

    if (salesUser?.managerId !== decoded.userId) {
      return NextResponse.json({ error: "Not allowed" }, { status: 403 });
    }

    const updated = await prisma.order.update({
      where: { id: orderId },
      data: { status: "APPROVED" },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Approval error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}