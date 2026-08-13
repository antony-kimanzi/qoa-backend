/*
  Warnings:

  - You are about to drop the column `createdAt` on the `orders` table. All the data in the column will be lost.
  - You are about to drop the column `isPaid` on the `orders` table. All the data in the column will be lost.
  - You are about to drop the column `orderStatus` on the `orders` table. All the data in the column will be lost.
  - You are about to drop the column `paymentMethod` on the `orders` table. All the data in the column will be lost.
  - You are about to drop the column `shippingMethod` on the `orders` table. All the data in the column will be lost.
  - You are about to drop the column `totalAmount` on the `orders` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `orders` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `orders` table. All the data in the column will be lost.
  - You are about to drop the column `checkoutRequestID` on the `transactions` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `transactions` table. All the data in the column will be lost.
  - You are about to drop the column `mpesaReceipt` on the `transactions` table. All the data in the column will be lost.
  - You are about to drop the column `orderId` on the `transactions` table. All the data in the column will be lost.
  - You are about to drop the column `phoneNumber` on the `transactions` table. All the data in the column will be lost.
  - You are about to drop the column `transactionDate` on the `transactions` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `transactions` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `transactions` table. All the data in the column will be lost.
  - You are about to drop the column `refresh_token` on the `users` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[checkout_requestId]` on the table `transactions` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[mpesa_receipt]` on the table `transactions` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `total_amount` to the `orders` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `orders` table without a default value. This is not possible if the table is not empty.
  - Added the required column `user_id` to the `orders` table without a default value. This is not possible if the table is not empty.
  - Added the required column `order_id` to the `transactions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `transactions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `user_id` to the `transactions` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "orders" DROP CONSTRAINT "orders_userId_fkey";

-- DropForeignKey
ALTER TABLE "transactions" DROP CONSTRAINT "transactions_orderId_fkey";

-- DropForeignKey
ALTER TABLE "transactions" DROP CONSTRAINT "transactions_userId_fkey";

-- DropIndex
DROP INDEX "orders_orderStatus_idx";

-- DropIndex
DROP INDEX "orders_userId_idx";

-- DropIndex
DROP INDEX "transactions_checkoutRequestID_idx";

-- DropIndex
DROP INDEX "transactions_checkoutRequestID_key";

-- DropIndex
DROP INDEX "transactions_mpesaReceipt_key";

-- DropIndex
DROP INDEX "transactions_orderId_idx";

-- DropIndex
DROP INDEX "transactions_userId_idx";

-- AlterTable
ALTER TABLE "orders" DROP COLUMN "createdAt",
DROP COLUMN "isPaid",
DROP COLUMN "orderStatus",
DROP COLUMN "paymentMethod",
DROP COLUMN "shippingMethod",
DROP COLUMN "totalAmount",
DROP COLUMN "updatedAt",
DROP COLUMN "userId",
ADD COLUMN     "billing_data" JSONB,
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "is_paid" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "order_status" TEXT NOT NULL DEFAULT 'pending',
ADD COLUMN     "payment_method" TEXT,
ADD COLUMN     "shipping_data" JSONB,
ADD COLUMN     "shipping_method" TEXT,
ADD COLUMN     "total_amount" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "user_id" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "transactions" DROP COLUMN "checkoutRequestID",
DROP COLUMN "createdAt",
DROP COLUMN "mpesaReceipt",
DROP COLUMN "orderId",
DROP COLUMN "phoneNumber",
DROP COLUMN "transactionDate",
DROP COLUMN "updatedAt",
DROP COLUMN "userId",
ADD COLUMN     "checkout_requestId" TEXT,
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "mpesa_receipt" TEXT,
ADD COLUMN     "order_id" INTEGER NOT NULL,
ADD COLUMN     "phone_number" TEXT,
ADD COLUMN     "transaction_date" TIMESTAMP(3),
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "user_id" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "users" DROP COLUMN "refresh_token";

-- CreateIndex
CREATE INDEX "orders_user_id_idx" ON "orders"("user_id");

-- CreateIndex
CREATE INDEX "orders_order_status_idx" ON "orders"("order_status");

-- CreateIndex
CREATE UNIQUE INDEX "transactions_checkout_requestId_key" ON "transactions"("checkout_requestId");

-- CreateIndex
CREATE UNIQUE INDEX "transactions_mpesa_receipt_key" ON "transactions"("mpesa_receipt");

-- CreateIndex
CREATE INDEX "transactions_checkout_requestId_idx" ON "transactions"("checkout_requestId");

-- CreateIndex
CREATE INDEX "transactions_order_id_idx" ON "transactions"("order_id");

-- CreateIndex
CREATE INDEX "transactions_user_id_idx" ON "transactions"("user_id");

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
