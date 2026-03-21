-- AlterTable: Add payment and delivery tracking fields to Order
ALTER TABLE "Order"
  ADD COLUMN "paymentStatus"  TEXT NOT NULL DEFAULT 'UNPAID',
  ADD COLUMN "paidAmount"     DOUBLE PRECISION NOT NULL DEFAULT 0,
  ADD COLUMN "deliveryStatus" TEXT NOT NULL DEFAULT 'PENDING',
  ADD COLUMN "deliveredAt"    TIMESTAMP(3);
