-- CreateEnum
CREATE TYPE "BuildingType" AS ENUM ('SOLAR', 'WIND', 'STORAGE', 'GRID', 'FABRICATOR');

-- CreateTable
CREATE TABLE "Player" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "regionId" TEXT NOT NULL,
    "creditsCents" INTEGER NOT NULL DEFAULT 0,
    "material" INTEGER NOT NULL DEFAULT 0,
    "energyWh" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Player_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Region" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "avgSolarWm2" DOUBLE PRECISION NOT NULL,
    "avgWindMs" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "Region_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Building" (
    "id" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "type" "BuildingType" NOT NULL,
    "level" INTEGER NOT NULL DEFAULT 1,
    "lastSettledAt" TIMESTAMP(3) NOT NULL,
    "remainderMilli" INTEGER NOT NULL DEFAULT 0,
    "upgradeDoneAt" TIMESTAMP(3),

    CONSTRAINT "Building_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WeatherHour" (
    "regionId" TEXT NOT NULL,
    "hourUtc" TIMESTAMP(3) NOT NULL,
    "solarWm2" DOUBLE PRECISION NOT NULL,
    "windMs" DOUBLE PRECISION NOT NULL,
    "estimated" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "WeatherHour_pkey" PRIMARY KEY ("regionId","hourUtc")
);

-- CreateTable
CREATE TABLE "PriceHour" (
    "hourUtc" TIMESTAMP(3) NOT NULL,
    "priceMilliCentsPerKwh" INTEGER NOT NULL,
    "estimated" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "PriceHour_pkey" PRIMARY KEY ("hourUtc")
);

-- CreateIndex
CREATE UNIQUE INDEX "Player_userId_key" ON "Player"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Building_playerId_type_key" ON "Building"("playerId", "type");

-- AddForeignKey
ALTER TABLE "Player" ADD CONSTRAINT "Player_regionId_fkey" FOREIGN KEY ("regionId") REFERENCES "Region"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Building" ADD CONSTRAINT "Building_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WeatherHour" ADD CONSTRAINT "WeatherHour_regionId_fkey" FOREIGN KEY ("regionId") REFERENCES "Region"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

