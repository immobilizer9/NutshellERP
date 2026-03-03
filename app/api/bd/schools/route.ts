import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function parseJwt(token: string) {
  try {
    return JSON.parse(atob(token.split(".")[1]));
  } catch {
    return null;
  }
}

export async function GET(req: Request) {
  const token = req.headers.get("cookie")?.match(/token=([^;]+)/)?.[1];

  if (!token)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const schools = await prisma.school.findMany({
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(schools);
}

export async function POST(req: Request) {
  const token = req.headers.get("cookie")?.match(/token=([^;]+)/)?.[1];

  if (!token)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const decoded = parseJwt(token);

  if (!decoded || !decoded.roles.includes("BD_HEAD"))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();

  const school = await prisma.school.create({
    data: {
      name: body.name,
      address: body.address,
      city: body.city,
      state: body.state,
      latitude: body.latitude,
      longitude: body.longitude,
      contactPerson: body.contactPerson,
      contactPhone: body.contactPhone,
    },
  });

  return NextResponse.json(school);
}