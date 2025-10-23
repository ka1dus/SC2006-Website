-- CreateEnum
CREATE TYPE "Region" AS ENUM ('CENTRAL', 'EAST', 'NORTH', 'NORTH_EAST', 'WEST', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('CLIENT', 'ADMIN');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'CLIENT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subzone" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "region" "Region" NOT NULL DEFAULT 'UNKNOWN',
    "geomGeoJSON" JSONB,
    "populationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subzone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Population" (
    "subzoneId" TEXT NOT NULL,
    "subzoneName" VARCHAR(120) NOT NULL,
    "year" INTEGER NOT NULL,
    "total" INTEGER NOT NULL,

    CONSTRAINT "Population_pkey" PRIMARY KEY ("subzoneId")
);

-- CreateTable
CREATE TABLE "PopulationUnmatched" (
    "id" TEXT NOT NULL,
    "sourceKey" VARCHAR(200) NOT NULL,
    "rawName" VARCHAR(200) NOT NULL,
    "reason" VARCHAR(200),
    "details" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PopulationUnmatched_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DatasetSnapshot" (
    "id" TEXT NOT NULL,
    "kind" VARCHAR(64) NOT NULL,
    "sourceUrl" VARCHAR(500),
    "versionNote" VARCHAR(200),
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "status" VARCHAR(40) NOT NULL,
    "meta" JSONB,

    CONSTRAINT "DatasetSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hawker_centres" (
    "id" TEXT NOT NULL,
    "centreId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "location" JSONB NOT NULL,
    "capacity" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "hawker_centres_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mrt_stations" (
    "id" TEXT NOT NULL,
    "stationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "location" JSONB NOT NULL,
    "lineCount" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mrt_stations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bus_stops" (
    "id" TEXT NOT NULL,
    "stopCode" TEXT NOT NULL,
    "roadName" TEXT NOT NULL,
    "location" JSONB NOT NULL,
    "freqWeight" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bus_stops_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "demand" (
    "id" TEXT NOT NULL,
    "subzoneId" TEXT NOT NULL,
    "rawKDE" DOUBLE PRECISION NOT NULL,
    "zScore" DOUBLE PRECISION NOT NULL,
    "lambdaD" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "demand_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "supply" (
    "id" TEXT NOT NULL,
    "subzoneId" TEXT NOT NULL,
    "rawKDECompeting" DOUBLE PRECISION NOT NULL,
    "zScore" DOUBLE PRECISION NOT NULL,
    "lambdaS" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "supply_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accessibility" (
    "id" TEXT NOT NULL,
    "subzoneId" TEXT NOT NULL,
    "rawMRTKDE" DOUBLE PRECISION NOT NULL,
    "rawBusKDE" DOUBLE PRECISION NOT NULL,
    "betaMRT" DOUBLE PRECISION NOT NULL,
    "betaBUS" DOUBLE PRECISION NOT NULL,
    "lambdaM" DOUBLE PRECISION NOT NULL,
    "lambdaB" DOUBLE PRECISION NOT NULL,
    "zScore" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "accessibility_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hawker_opportunity_scores" (
    "id" TEXT NOT NULL,
    "subzoneId" TEXT NOT NULL,
    "H" DOUBLE PRECISION NOT NULL,
    "zDemand" DOUBLE PRECISION NOT NULL,
    "zSupply" DOUBLE PRECISION NOT NULL,
    "zAccess" DOUBLE PRECISION NOT NULL,
    "wD" DOUBLE PRECISION NOT NULL,
    "wS" DOUBLE PRECISION NOT NULL,
    "wA" DOUBLE PRECISION NOT NULL,
    "percentile" DOUBLE PRECISION NOT NULL,
    "snapshotId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "hawker_opportunity_scores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "snapshots" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,

    CONSTRAINT "snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dataset_versions" (
    "id" TEXT NOT NULL,
    "snapshotId" TEXT NOT NULL,
    "datasetName" TEXT NOT NULL,
    "sourceURL" TEXT NOT NULL,
    "lastUpdated" TIMESTAMP(3) NOT NULL,
    "retrievedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "schemaHash" TEXT NOT NULL,

    CONSTRAINT "dataset_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kernel_configs" (
    "id" TEXT NOT NULL,
    "kernelType" TEXT NOT NULL DEFAULT 'Gaussian',
    "lambdaD" DOUBLE PRECISION NOT NULL,
    "lambdaS" DOUBLE PRECISION NOT NULL,
    "lambdaM" DOUBLE PRECISION NOT NULL,
    "lambdaB" DOUBLE PRECISION NOT NULL,
    "betaMRT" DOUBLE PRECISION NOT NULL,
    "betaBUS" DOUBLE PRECISION NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "kernel_configs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Subzone_populationId_key" ON "Subzone"("populationId");

-- CreateIndex
CREATE INDEX "Subzone_name_idx" ON "Subzone"("name");

-- CreateIndex
CREATE INDEX "Subzone_region_idx" ON "Subzone"("region");

-- CreateIndex
CREATE INDEX "Population_year_idx" ON "Population"("year");

-- CreateIndex
CREATE INDEX "Population_total_idx" ON "Population"("total");

-- CreateIndex
CREATE INDEX "DatasetSnapshot_kind_startedAt_idx" ON "DatasetSnapshot"("kind", "startedAt");

-- CreateIndex
CREATE UNIQUE INDEX "hawker_centres_centreId_key" ON "hawker_centres"("centreId");

-- CreateIndex
CREATE UNIQUE INDEX "mrt_stations_stationId_key" ON "mrt_stations"("stationId");

-- CreateIndex
CREATE UNIQUE INDEX "bus_stops_stopCode_key" ON "bus_stops"("stopCode");

-- CreateIndex
CREATE UNIQUE INDEX "demand_subzoneId_key" ON "demand"("subzoneId");

-- CreateIndex
CREATE UNIQUE INDEX "supply_subzoneId_key" ON "supply"("subzoneId");

-- CreateIndex
CREATE UNIQUE INDEX "accessibility_subzoneId_key" ON "accessibility"("subzoneId");

-- AddForeignKey
ALTER TABLE "Population" ADD CONSTRAINT "Population_subzoneId_fkey" FOREIGN KEY ("subzoneId") REFERENCES "Subzone"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "demand" ADD CONSTRAINT "demand_subzoneId_fkey" FOREIGN KEY ("subzoneId") REFERENCES "Subzone"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supply" ADD CONSTRAINT "supply_subzoneId_fkey" FOREIGN KEY ("subzoneId") REFERENCES "Subzone"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accessibility" ADD CONSTRAINT "accessibility_subzoneId_fkey" FOREIGN KEY ("subzoneId") REFERENCES "Subzone"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hawker_opportunity_scores" ADD CONSTRAINT "hawker_opportunity_scores_subzoneId_fkey" FOREIGN KEY ("subzoneId") REFERENCES "Subzone"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hawker_opportunity_scores" ADD CONSTRAINT "hawker_opportunity_scores_snapshotId_fkey" FOREIGN KEY ("snapshotId") REFERENCES "snapshots"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dataset_versions" ADD CONSTRAINT "dataset_versions_snapshotId_fkey" FOREIGN KEY ("snapshotId") REFERENCES "snapshots"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kernel_configs" ADD CONSTRAINT "kernel_configs_id_fkey" FOREIGN KEY ("id") REFERENCES "snapshots"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
