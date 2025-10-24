/*
  Warnings:

  - You are about to drop the column `centreId` on the `hawker_centres` table. All the data in the column will be lost.
  - You are about to alter the column `name` on the `hawker_centres` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(200)`.
  - You are about to alter the column `address` on the `hawker_centres` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(300)`.
  - You are about to alter the column `operator` on the `hawker_centres` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(100)`.

*/
-- DropIndex
DROP INDEX "hawker_centres_centreId_key";

-- AlterTable
ALTER TABLE "hawker_centres" DROP COLUMN "centreId",
ALTER COLUMN "name" SET DATA TYPE VARCHAR(200),
ALTER COLUMN "address" SET DATA TYPE VARCHAR(300),
ALTER COLUMN "operator" SET DATA TYPE VARCHAR(100);
