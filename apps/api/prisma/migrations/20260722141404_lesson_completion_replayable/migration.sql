-- DropIndex
DROP INDEX "LessonCompletion_userId_lessonId_key";

-- CreateIndex
CREATE INDEX "LessonCompletion_userId_lessonId_idx" ON "LessonCompletion"("userId", "lessonId");
