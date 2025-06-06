-- CreateEnum
CREATE TYPE "Currency" AS ENUM ('USD', 'UAH', 'EUR');

-- AlterTable
ALTER TABLE "Classified" ADD COLUMN     "currency" "Currency" NOT NULL DEFAULT 'USD';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "currency" "Currency" NOT NULL DEFAULT 'USD';
