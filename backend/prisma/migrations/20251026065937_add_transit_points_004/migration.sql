/*
  Warnings:

  - You are about to drop the column `roadName` on the `bus_stops` table. All the data in the column will be lost.
  - You are about to drop the column `stopCode` on the `bus_stops` table. All the data in the column will be lost.
  - You are about to alter the column `name` on the `bus_stops` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(200)`.
  - You are about to drop the `mrt_stations` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "mrt_stations" DROP CONSTRAINT "mrt_stations_subzoneId_fkey";

-- DropIndex
DROP INDEX "bus_stops_stopCode_key";

-- AlterTable
ALTER TABLE "bus_stops" DROP COLUMN "roadName",
DROP COLUMN "stopCode",
ADD COLUMN     "road" VARCHAR(200),
ALTER COLUMN "name" SET DATA TYPE VARCHAR(200);

-- DropTable
DROP TABLE "mrt_stations";

-- CreateTable
CREATE TABLE "mrt_exits" (
    "id" TEXT NOT NULL,
    "station" VARCHAR(200),
    "code" VARCHAR(50),
    "location" JSONB NOT NULL,
    "subzoneId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mrt_exits_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "mrt_exits_subzoneId_idx" ON "mrt_exits"("subzoneId");

-- AddForeignKey
ALTER TABLE "mrt_exits" ADD CONSTRAINT "mrt_exits_subzoneId_fkey" FOREIGN KEY ("subzoneId") REFERENCES "Subzone"("id") ON DELETE SET NULL ON UPDATE CASCADE;
