-- AlterTable
ALTER TABLE "LessonCompletion" ADD COLUMN     "answers" JSONB,
ADD COLUMN     "autoScore" INTEGER,
ADD COLUMN     "autoTotal" INTEGER,
ADD COLUMN     "feedback" JSONB,
ADD COLUMN     "gradedAt" TIMESTAMP(3),
ADD COLUMN     "manualScore" INTEGER,
ADD COLUMN     "manualTotal" INTEGER;
