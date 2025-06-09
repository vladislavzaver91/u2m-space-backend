/*
  Warnings:

  - A unique constraint covering the columns `[nickname]` on the table `User` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "Language" AS ENUM ('en', 'uk', 'pl');

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('Male', 'Female');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "advancedUser" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "birthday" TIMESTAMP(3),
ADD COLUMN     "bonuses" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "city" TEXT,
ADD COLUMN     "deleteReason" TEXT,
ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "extraPhoneNumber" TEXT,
ADD COLUMN     "gender" "Gender",
ADD COLUMN     "language" "Language" NOT NULL DEFAULT 'en',
ADD COLUMN     "legalSurname" TEXT,
ADD COLUMN     "nickname" TEXT,
ADD COLUMN     "notifications" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "showPhone" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "trustRating" INTEGER NOT NULL DEFAULT 50;

-- CreateIndex
CREATE UNIQUE INDEX "User_nickname_key" ON "User"("nickname");
