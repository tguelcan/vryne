-- AlterTable
ALTER TABLE "Player" ADD COLUMN "xp" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "NewsEvent" (
    "id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "headline" TEXT NOT NULL,
    "generated" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NewsEvent_pkey" PRIMARY KEY ("id")
);
