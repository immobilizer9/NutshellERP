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

  if (!decoded)
    return NextResponse.json({ error: "Invalid token" }, { status: 403 });

  const { orderId, itemId, quantity, reason } = await req.json();

  if (!orderId || !itemId || !quantity)
    return NextResponse.json({ error: "Invalid data" }, { status: 400 });

  const item = await prisma.orderItem.findUnique({
    where: { id: itemId },
    include: { returns: true },
  });

  if (!item)
    return NextResponse.json({ error: "Item not found" }, { status: 404 });

  const alreadyReturned = item.returns.reduce(
    (sum, r) => sum + r.quantity,
    0
  );

  if (alreadyReturned + quantity > item.quantity) {
    return NextResponse.json(
      { error: "Return exceeds ordered quantity" },
      { status: 400 }
    );
  }

  const unitPrice = item.unitPrice;
  const amount = quantity * unitPrice;

  await prisma.return.create({
    data: {
      orderId,
      itemId,
      quantity,
      amount,
      reason,
    },
  });

  // Recalculate netAmount
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      returns: true,
    },
  });

  if (!order)
    return NextResponse.json({ error: "Order not found" }, { status: 404 });

  const totalReturns = order.returns.reduce(
    (sum, r) => sum + r.amount,
    0
  );

  const newNet = order.grossAmount - totalReturns;

  await prisma.order.update({
    where: { id: orderId },
    data: { netAmount: newNet },
  });

  return NextResponse.json({ success: true });
}