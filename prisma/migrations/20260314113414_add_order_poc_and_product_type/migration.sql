/*
  Warnings:

  - Added the required column `mrp` to the `OrderItem` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "address1" TEXT,
ADD COLUMN     "address2" TEXT,
ADD COLUMN     "deliveryDate" TIMESTAMP(3),
ADD COLUMN     "orderDate" TIMESTAMP(3),
ADD COLUMN     "pincode" TEXT,
ADD COLUMN     "productType" TEXT NOT NULL DEFAULT 'ANNUAL',
ADD COLUMN     "schoolEmail" TEXT,
ADD COLUMN     "schoolPhone" TEXT;

-- AlterTable
ALTER TABLE "OrderItem" ADD COLUMN "mrp" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "OrderPOC" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "name" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrderPOC_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "OrderPOC" ADD CONSTRAINT "OrderPOC_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
