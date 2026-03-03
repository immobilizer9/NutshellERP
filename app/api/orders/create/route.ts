import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const { schoolId, items, userId } = body;

    if (!schoolId || !items?.length) {
      return NextResponse.json(
        { error: "Invalid data" },
        { status: 400 }
      );
    }

    const grossAmount = items.reduce(
      (sum: number, item: any) =>
        sum + item.quantity * item.unitPrice,
      0
    );

    const createdOrder = await prisma.order.create({
      data: {
        schoolId,
        createdById: userId, // pass from frontend OR decode JWT
        grossAmount,
        netAmount: grossAmount,
        status: "FINALIZED",
        items: {
          create: items.map((item: any) => ({
            className: item.className,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            total: item.quantity * item.unitPrice,
          })),
        },
      },
    });

    return NextResponse.json(createdOrder);
  } catch (error) {
    console.error("Order create error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}