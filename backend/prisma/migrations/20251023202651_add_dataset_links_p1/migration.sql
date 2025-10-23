/*
  Warnings:

  - You are about to drop the column `freqWeight` on the `bus_stops` table. All the data in the column will be lost.
  - You are about to drop the column `capacity` on the `hawker_centres` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `hawker_centres` table. All the data in the column will be lost.
  - You are about to drop the column `lineCount` on the `mrt_stations` table. All the data in the column will be lost.
  - Added the required column `updatedAt` to the `bus_stops` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `hawker_centres` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `mrt_stations` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "bus_stops" DROP COLUMN "freqWeight",
ADD COLUMN     "name" TEXT,
ADD COLUMN     "subzoneId" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ALTER COLUMN "roadName" DROP NOT NULL;

-- AlterTable
ALTER TABLE "hawker_centres" DROP COLUMN "capacity",
DROP COLUMN "status",
ADD COLUMN     "address" TEXT,
ADD COLUMN     "operator" TEXT,
ADD COLUMN     "subzoneId" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "mrt_stations" DROP COLUMN "lineCount",
ADD COLUMN     "code" TEXT,
ADD COLUMN     "exitCode" TEXT,
ADD COLUMN     "subzoneId" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- CreateIndex
CREATE INDEX "bus_stops_subzoneId_idx" ON "bus_stops"("subzoneId");

-- CreateIndex
CREATE INDEX "hawker_centres_subzoneId_idx" ON "hawker_centres"("subzoneId");

-- CreateIndex
CREATE INDEX "mrt_stations_subzoneId_idx" ON "mrt_stations"("subzoneId");

-- CreateIndex
CREATE INDEX "mrt_stations_code_idx" ON "mrt_stations"("code");

-- AddForeignKey
ALTER TABLE "hawker_centres" ADD CONSTRAINT "hawker_centres_subzoneId_fkey" FOREIGN KEY ("subzoneId") REFERENCES "Subzone"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mrt_stations" ADD CONSTRAINT "mrt_stations_subzoneId_fkey" FOREIGN KEY ("subzoneId") REFERENCES "Subzone"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bus_stops" ADD CONSTRAINT "bus_stops_subzoneId_fkey" FOREIGN KEY ("subzoneId") REFERENCES "Subzone"("id") ON DELETE SET NULL ON UPDATE CASCADE;
