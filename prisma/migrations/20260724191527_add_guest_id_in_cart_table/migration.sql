/*
  Warnings:

  - A unique constraint covering the columns `[guest_id]` on the table `carts` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "carts" ADD COLUMN     "guest_id" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "carts_guest_id_key" ON "carts"("guest_id");
