-- apps/api/prisma/migrations/20261012_review_target_check/migration.sql

-- Contrainte : un avis doit cibler AU MOINS un productId, variantId, storeId ou professionalId
ALTER TABLE "reviews"
ADD CONSTRAINT "reviews_target_check" CHECK (
  "product_id" IS NOT NULL
  OR "variant_id" IS NOT NULL
  OR "store_id" IS NOT NULL
  OR "professional_id" IS NOT NULL
);