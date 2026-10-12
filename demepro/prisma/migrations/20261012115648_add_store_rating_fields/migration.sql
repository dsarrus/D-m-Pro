-- AlterTable
ALTER TABLE "stores" ADD COLUMN     "rating_average" DECIMAL(3,2) NOT NULL DEFAULT 0,
ADD COLUMN     "rating_count" INTEGER NOT NULL DEFAULT 0;
