-- CreateEnum
CREATE TYPE "ResourceType" AS ENUM ('CRYSTAL', 'ALLOY', 'BIOMASS', 'DATACORE', 'FUEL');

-- CreateTable
CREATE TABLE "ResourceBalance" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "resource" "ResourceType" NOT NULL,
    "amount" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ResourceBalance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CraftedItemStock" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "buildingKey" TEXT NOT NULL,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "totalCrafted" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CraftedItemStock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OutpostBuilding" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "buildingKey" TEXT NOT NULL,
    "x" INTEGER NOT NULL,
    "y" INTEGER NOT NULL,
    "placedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OutpostBuilding_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuestClaim" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "questKey" TEXT NOT NULL,
    "claimedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuestClaim_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ResourceBalance_userId_resource_key" ON "ResourceBalance"("userId", "resource");

-- CreateIndex
CREATE UNIQUE INDEX "CraftedItemStock_userId_buildingKey_key" ON "CraftedItemStock"("userId", "buildingKey");

-- CreateIndex
CREATE UNIQUE INDEX "OutpostBuilding_userId_x_y_key" ON "OutpostBuilding"("userId", "x", "y");

-- CreateIndex
CREATE UNIQUE INDEX "QuestClaim_userId_questKey_key" ON "QuestClaim"("userId", "questKey");

-- AddForeignKey
ALTER TABLE "ResourceBalance" ADD CONSTRAINT "ResourceBalance_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CraftedItemStock" ADD CONSTRAINT "CraftedItemStock_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OutpostBuilding" ADD CONSTRAINT "OutpostBuilding_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestClaim" ADD CONSTRAINT "QuestClaim_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
