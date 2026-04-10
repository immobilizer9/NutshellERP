import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken, getTokenFromRequest, hasModule } from "@/lib/auth";

export async function GET(req: Request) {
  try {
    const token = getTokenFromRequest(req);
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const decoded = verifyToken(token);
    if (!decoded || !hasModule(decoded, "USER_MANAGEMENT"))
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { searchParams } = new URL(req.url);
    const month  = searchParams.get("month")  ? parseInt(searchParams.get("month")!)  : null;
    const year   = searchParams.get("year")   ? parseInt(searchParams.get("year")!)   : null;
    const search = searchParams.get("search") ?? "";

    let orderDateFilter: any = {};
    if (month && year) {
      const start = new Date(year, month - 1, 1);
      const end   = new Date(year, month, 1);
      orderDateFilter = { createdAt: { gte: start, lt: end } };
    }

    const returns = await prisma.return.findMany({
      where: {
        order: {
          organizationId: decoded.organizationId,
          ...orderDateFilter,
          ...(search
            ? { school: { name: { contains: search, mode: "insensitive" } } }
            : {}),
        },
      },
      include: {
        order: {
          select: {
            id: true,
            school: { select: { name: true, city: true } },
            createdBy: { select: { name: true } },
            status: true,
          },
        },
        item: {
          select: { className: true, unitPrice: true, quantity: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const totalAmount = returns.reduce((s, r) => s + r.amount, 0);
    const totalQty    = returns.reduce((s, r) => s + r.quantity, 0);

    return NextResponse.json({ returns, totalAmount, totalQty });
  } catch (err) {
    console.error("Returns list error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
