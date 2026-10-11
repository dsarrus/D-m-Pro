-- AlterTable
ALTER TABLE "professional_profiles" ADD COLUMN     "certified_by_user_id" UUID,
ADD COLUMN     "kyc_document_key" VARCHAR(500),
ADD COLUMN     "selfie_key" VARCHAR(500);

-- CreateIndex
CREATE INDEX "professional_profiles_verification_level_idx" ON "professional_profiles"("verification_level");
