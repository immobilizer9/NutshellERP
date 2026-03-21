-- AlterTable: Add outcome fields to Visit
ALTER TABLE "Visit"
  ADD COLUMN "outcome"       TEXT,
  ADD COLUMN "nextVisitDate" TIMESTAMP(3);
