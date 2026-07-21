-- CreateEnum
CREATE TYPE "LessonStatus" AS ENUM ('DRAFT', 'PENDING_REVIEW', 'PUBLISHED', 'REJECTED');

-- AlterTable: Lesson — add status/rejectionNote, backfill status from the
-- old published flag, then drop published (3 existing rows all
-- published=true at the time of writing, preserved as status=PUBLISHED).
ALTER TABLE "Lesson" ADD COLUMN "status" "LessonStatus" NOT NULL DEFAULT 'DRAFT';
ALTER TABLE "Lesson" ADD COLUMN "rejectionNote" TEXT;
UPDATE "Lesson" SET "status" = 'PUBLISHED' WHERE "published" = true;
ALTER TABLE "Lesson" DROP COLUMN "published";

-- AlterTable: User
ALTER TABLE "User" ADD COLUMN "banned" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN "bannedReason" TEXT;

-- CreateTable
CREATE TABLE "GameProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "stardust" INTEGER NOT NULL DEFAULT 0,
    "shipTier" INTEGER NOT NULL DEFAULT 1,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GameProfile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GameProfile_userId_key" ON "GameProfile"("userId");

-- AddForeignKey
ALTER TABLE "GameProfile" ADD CONSTRAINT "GameProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
