// lib/auditLog.ts
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

type AuditParams = {
  action:         string;
  entity?:        string;
  entityId?:      string;
  userId?:        string;
  userName?:      string;
  organizationId: string;
  metadata?:      Record<string, any>;
};

export async function writeAuditLog(params: AuditParams): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        action:         params.action,
        entity:         params.entity   ?? null,
        entityId:       params.entityId ?? null,
        userId:         params.userId   ?? null,
        userName:       params.userName ?? null,
        organizationId: params.organizationId,
        // ✅ Prisma Json field needs undefined (not null) when there's no value
        metadata: params.metadata ?? Prisma.JsonNull,
      },
    });
  } catch (err) {
    console.error("Audit log write failed:", err);
  }
}