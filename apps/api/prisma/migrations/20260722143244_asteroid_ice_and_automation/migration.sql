-- AlterEnum
ALTER TYPE "ResourceType" ADD VALUE 'ICE';

-- AlterTable
ALTER TABLE "OutpostBuilding" ADD COLUMN     "lastAutomationAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
