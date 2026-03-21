-- CreateTable: Target (monthly sales targets per user)
CREATE TABLE "Target" (
  "id"             TEXT NOT NULL,
  "userId"         TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "month"          INTEGER NOT NULL,
  "year"           INTEGER NOT NULL,
  "revenueTarget"  DOUBLE PRECISION NOT NULL DEFAULT 0,
  "ordersTarget"   INTEGER NOT NULL DEFAULT 0,
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"      TIMESTAMP(3) NOT NULL,

  CONSTRAINT "Target_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Target_userId_month_year_key" ON "Target"("userId", "month", "year");

ALTER TABLE "Target" ADD CONSTRAINT "Target_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
