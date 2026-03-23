-- Add rejectionReason to Order
ALTER TABLE "Order" ADD COLUMN "rejectionReason" TEXT;

-- Add incentivePercent to Target
ALTER TABLE "Target" ADD COLUMN "incentivePercent" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- Create Notification table
CREATE TABLE "Notification" (
  "id"             TEXT NOT NULL,
  "userId"         TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "type"           TEXT NOT NULL,
  "title"          TEXT NOT NULL,
  "message"        TEXT NOT NULL,
  "entityType"     TEXT,
  "entityId"       TEXT,
  "isRead"         BOOLEAN NOT NULL DEFAULT false,
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- Foreign key: Notification.userId → User.id
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
