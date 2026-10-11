-- CreateEnum
CREATE TYPE "VerificationLevel" AS ENUM ('BASIC', 'TRUSTED', 'CERTIFIED');

-- AlterTable
ALTER TABLE "professional_profiles" ADD COLUMN     "certified_at" TIMESTAMPTZ(3),
ADD COLUMN     "successful_transactions" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "verification_level" "VerificationLevel" NOT NULL DEFAULT 'BASIC',
ADD COLUMN     "verified_at" TIMESTAMPTZ(3);
