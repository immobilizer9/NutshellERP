import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const { orderId, itemId, quantity, amount, reason } = body;

    const createdReturn = await prisma.return.create({
      data: {
        orderId,
        itemId,
        quantity,
        amount,
        reason,
      },
    });

    return NextResponse.json(createdReturn);
  } catch (error) {
    console.error("Add return error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}