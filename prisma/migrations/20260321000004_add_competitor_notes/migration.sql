-- CreateTable: CompetitorNote (competitor intelligence per school)
CREATE TABLE "CompetitorNote" (
  "id"          TEXT NOT NULL,
  "schoolId"    TEXT NOT NULL,
  "createdById" TEXT NOT NULL,
  "competitor"  TEXT NOT NULL,
  "notes"       TEXT,
  "isActive"    BOOLEAN NOT NULL DEFAULT true,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3) NOT NULL,

  CONSTRAINT "CompetitorNote_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "CompetitorNote" ADD CONSTRAINT "CompetitorNote_schoolId_fkey"
  FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "CompetitorNote" ADD CONSTRAINT "CompetitorNote_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
