-- CreateTable
CREATE TABLE "AuthState" (
    "id" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "user" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AuthState_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AuthState_state_key" ON "AuthState"("state");
