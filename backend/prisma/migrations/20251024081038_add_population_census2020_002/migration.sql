/*
  Warnings:

  - You are about to drop the column `populationId` on the `Subzone` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "Subzone_populationId_key";

-- AlterTable
ALTER TABLE "Subzone" DROP COLUMN "populationId";
