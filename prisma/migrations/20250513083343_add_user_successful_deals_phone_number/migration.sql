-- AlterTable
ALTER TABLE "User" ADD COLUMN     "phoneNumber" TEXT,
ADD COLUMN     "successfulDeals" INTEGER NOT NULL DEFAULT 0;
