-- CreateEnum
CREATE TYPE "AgentEventStatus" AS ENUM ('IN_PROGRESS', 'COMPLETED');

-- CreateTable
CREATE TABLE "AgentActivityLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "status" "AgentEventStatus" NOT NULL,
    "userResponses" JSONB,
    "metadata" JSONB,
    "clientTimestamp" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AgentActivityLog_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "AgentActivityLog" ADD CONSTRAINT "AgentActivityLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentActivityLog" ADD CONSTRAINT "AgentActivityLog_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
