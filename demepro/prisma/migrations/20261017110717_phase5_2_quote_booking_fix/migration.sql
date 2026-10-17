/*
  Warnings:

  - The `status` column on the `bookings` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `status` column on the `quotes` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - Added the required column `professional_id` to the `quote_responses` table without a default value. This is not possible if the table is not empty.
  - Made the column `order_id` on table `reviews` required. This step will fail if there are existing NULL values in that column.

*/
-- CreateEnum
CREATE TYPE "QuoteStatus" AS ENUM ('PENDING', 'RESPONDED', 'ACCEPTED', 'REJECTED', 'EXPIRED', 'CONVERTED');

-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW');

-- DropForeignKey
ALTER TABLE "reviews" DROP CONSTRAINT "reviews_booking_id_fkey";

-- DropIndex
DROP INDEX "reviews_service_id_rating_idx";

-- AlterTable
ALTER TABLE "availabilities" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "start_time" SET DATA TYPE TEXT,
ALTER COLUMN "end_time" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "bookings" ALTER COLUMN "id" DROP DEFAULT,
DROP COLUMN "status",
ADD COLUMN     "status" "BookingStatus" NOT NULL DEFAULT 'CONFIRMED';

-- AlterTable
ALTER TABLE "quote_responses" ADD COLUMN     "professional_id" UUID NOT NULL,
ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "quotes" ALTER COLUMN "id" DROP DEFAULT,
DROP COLUMN "status",
ADD COLUMN     "status" "QuoteStatus" NOT NULL DEFAULT 'PENDING';

-- AlterTable
ALTER TABLE "reviews" ALTER COLUMN "order_id" SET NOT NULL;

-- AlterTable
ALTER TABLE "service_images" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "service_zones" ALTER COLUMN "id" DROP DEFAULT;

-- CreateIndex
CREATE INDEX "bookings_service_id_status_scheduled_at_idx" ON "bookings"("service_id", "status", "scheduled_at");

-- CreateIndex
CREATE INDEX "bookings_user_id_status_idx" ON "bookings"("user_id", "status");

-- CreateIndex
CREATE INDEX "quote_responses_professional_id_idx" ON "quote_responses"("professional_id");

-- CreateIndex
CREATE INDEX "quotes_service_id_status_idx" ON "quotes"("service_id", "status");

-- CreateIndex
CREATE INDEX "quotes_user_id_status_idx" ON "quotes"("user_id", "status");

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quote_responses" ADD CONSTRAINT "quote_responses_professional_id_fkey" FOREIGN KEY ("professional_id") REFERENCES "professional_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
