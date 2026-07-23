-- CreateTable
CREATE TABLE "SpaceStationBuilding" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "buildingKey" TEXT NOT NULL,
    "x" INTEGER NOT NULL,
    "y" INTEGER NOT NULL,
    "placedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastCollectedAt" TIMESTAMP(3),
    "lastAutomationAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SpaceStationBuilding_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SpaceStationBuilding_userId_x_y_key" ON "SpaceStationBuilding"("userId", "x", "y");

-- AddForeignKey
ALTER TABLE "SpaceStationBuilding" ADD CONSTRAINT "SpaceStationBuilding_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
