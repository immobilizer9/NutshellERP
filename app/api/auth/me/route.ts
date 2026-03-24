import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken, getTokenFromRequest } from "@/lib/auth";

export async function GET(req: Request) {
  const token = getTokenFromRequest(req);

  if (!token) {
    return NextResponse.json({ user: null }, { status: 200 });
  }

  const decoded = verifyToken(token);
  if (!decoded) {
    return NextResponse.json({ user: null }, { status: 200 });
  }

  // Fetch user with roles and their permissions
  const user = await prisma.user.findUnique({
    where: { id: decoded.userId },
    select: {
      id: true,
      name: true,
      email: true,
      roles: {
        include: {
          role: {
            include: {
              permissions: {
                include: { permission: true },
              },
            },
          },
        },
      },
    },
  });

  if (!user) {
    return NextResponse.json({ user: null }, { status: 200 });
  }

  const roles = user.roles.map((ur) => ur.role.name);

  const modulesSet = new Set<string>();
  for (const ur of user.roles) {
    for (const rp of ur.role.permissions) {
      modulesSet.add(rp.permission.name);
    }
  }

  return NextResponse.json({
    user: {
      userId: user.id,
      name: user.name,
      email: user.email,
      organizationId: decoded.organizationId,
      roles,
      modules: Array.from(modulesSet),
    },
  });
}
