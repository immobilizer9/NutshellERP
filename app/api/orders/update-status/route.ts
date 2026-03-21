import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken, getTokenFromRequest } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const token = getTokenFromRequest(req);
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const decoded = verifyToken(token);
    if (!decoded) return NextResponse.json({ error: "Invalid token" }, { status: 401 });

    const isBDorAdmin = decoded.roles.includes("BD_HEAD") || decoded.roles.includes("ADMIN");
    if (!isBDorAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = await req.json();
    const { orderId, paymentStatus, paidAmount, deliveryStatus } = body;

    if (!orderId) return NextResponse.json({ error: "orderId is required" }, { status: 400 });

    const validPayment  = ["UNPAID", "PARTIAL", "PAID"];
    const validDelivery = ["PENDING", "DISPATCHED", "DELIVERED"];

    if (paymentStatus  && !validPayment.includes(paymentStatus))  return NextResponse.json({ error: "Invalid paymentStatus"  }, { status: 400 });
    if (deliveryStatus && !validDelivery.includes(deliveryStatus)) return NextResponse.json({ error: "Invalid deliveryStatus" }, { status: 400 });

    const data: any = {};
    if (paymentStatus  !== undefined) data.paymentStatus  = paymentStatus;
    if (paidAmount     !== undefined) data.paidAmount     = Number(paidAmount);
    if (deliveryStatus !== undefined) {
      data.deliveryStatus = deliveryStatus;
      if (deliveryStatus === "DELIVERED") data.deliveredAt = new Date();
      else if (deliveryStatus !== "DELIVERED") data.deliveredAt = null;
    }

    const order = await prisma.order.update({ where: { id: orderId }, data });
    return NextResponse.json(order);
  } catch (err) {
    console.error("update-status error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
