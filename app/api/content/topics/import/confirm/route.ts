import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken, getTokenFromRequest, hasModule } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const token = getTokenFromRequest(req);
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const decoded = verifyToken(token);
    if (!decoded || !hasModule(decoded, "USER_MANAGEMENT")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { rows } = body;

    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ error: "No rows provided" }, { status: 400 });
    }

    const validRows = (rows as any[]).filter((r) => r.valid);
    let created = 0;
    let failed  = 0;
    const errors: string[] = [];

    for (const row of validRows) {
      try {
        await prisma.$transaction(async (tx) => {
          // 1. Create topic
          const topic = await tx.contentTopic.create({
            data: {
              title:        row.title,
              description:  row.description ?? null,
              productType:  row.productType,
              classFrom:    row.classFrom,
              classTo:      row.classTo,
              assignedToId: row.assigneeId,
              assignedById: decoded.userId,
              dueDate:      row.dueDate ? new Date(row.dueDate) : null,
              year:         new Date().getFullYear(),
            },
          });

          // 2. Create primary document
          const doc = await tx.contentDocument.create({
            data: {
              topicId:  topic.id,
              title:    row.title,
              body:     "",
              authorId: row.assigneeId,
              status:   "DRAFT",
            },
          });

          // 3. Link document back to topic
          await tx.contentTopic.update({
            where: { id: topic.id },
            data:  { documentId: doc.id },
          });
        });
        created++;
      } catch (err: any) {
        failed++;
        errors.push(`Row ${row.rowNum} "${row.title}": ${err.message}`);
      }
    }

    return NextResponse.json({ created, failed, errors });
  } catch (error) {
    console.error("Sheet import confirm error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
