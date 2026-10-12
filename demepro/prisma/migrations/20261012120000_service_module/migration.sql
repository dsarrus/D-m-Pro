-- 1. Créer le nouvel enum
CREATE TYPE "PricingModel" AS ENUM ('QUOTE', 'FIXED', 'HOURLY');

-- 2. Ajouter la colonne pricing_model avec default
ALTER TABLE "services"
ADD COLUMN "pricing_model" "PricingModel" NOT NULL DEFAULT 'QUOTE';

-- 3. Mapper les anciennes valeurs
UPDATE "services" SET "pricing_model" = 'FIXED' WHERE "pricing_type" = 'FIXED';

-- 4. Supprimer l'ancienne colonne
ALTER TABLE "services" DROP COLUMN "pricing_type";

-- 5. Supprimer l'ancien enum
DROP TYPE "PricingType";

-- 6. Ajouter ratingAverage / ratingCount à Service
ALTER TABLE "services"
ADD COLUMN "rating_average" DECIMAL(3,2) NOT NULL DEFAULT 0,
ADD COLUMN "rating_count" INTEGER NOT NULL DEFAULT 0;

-- 7. Créer service_images
CREATE TABLE "service_images" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "service_id" UUID NOT NULL,
  "object_key" VARCHAR(500) NOT NULL,
  "alt_text" VARCHAR(255),
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "is_primary" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "service_images_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "service_images_service_id_sort_order_idx"
  ON "service_images"("service_id", "sort_order");

ALTER TABLE "service_images"
  ADD CONSTRAINT "service_images_service_id_fkey"
  FOREIGN KEY ("service_id") REFERENCES "services"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- 8. Créer service_zones
CREATE TABLE "service_zones" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "service_id" UUID NOT NULL,
  "city" VARCHAR(100),
  "region" VARCHAR(100),
  "radius_km" INTEGER,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "service_zones_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "service_zones_service_id_idx" ON "service_zones"("service_id");

ALTER TABLE "service_zones"
  ADD CONSTRAINT "service_zones_service_id_fkey"
  FOREIGN KEY ("service_id") REFERENCES "services"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- 9. Créer availabilities
CREATE TABLE "availabilities" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "service_id" UUID NOT NULL,
  "day_of_week" INTEGER,
  "start_time" VARCHAR(5),
  "end_time" VARCHAR(5),
  "specific_date" DATE,
  "is_recurring" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "availabilities_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "availabilities_service_id_day_of_week_idx"
  ON "availabilities"("service_id", "day_of_week");

ALTER TABLE "availabilities"
  ADD CONSTRAINT "availabilities_service_id_fkey"
  FOREIGN KEY ("service_id") REFERENCES "services"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- 10. Créer quotes
CREATE TABLE "quotes" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "service_id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "status" VARCHAR(20) NOT NULL DEFAULT 'PENDING',
  "description" TEXT NOT NULL,
  "budget" DECIMAL(12,2),
  "currency" CHAR(3) NOT NULL DEFAULT 'XOF',
  "expires_at" TIMESTAMPTZ(3) NOT NULL,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "quotes_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "quotes_service_id_status_idx" ON "quotes"("service_id", "status");
CREATE INDEX "quotes_user_id_status_idx" ON "quotes"("user_id", "status");

ALTER TABLE "quotes"
  ADD CONSTRAINT "quotes_service_id_fkey"
  FOREIGN KEY ("service_id") REFERENCES "services"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "quotes"
  ADD CONSTRAINT "quotes_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- 11. Créer quote_responses
CREATE TABLE "quote_responses" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "quote_id" UUID NOT NULL,
  "proposed_price" DECIMAL(12,2) NOT NULL,
  "currency" CHAR(3) NOT NULL DEFAULT 'XOF',
  "message" TEXT,
  "proposed_date" TIMESTAMPTZ(3),
  "expires_at" TIMESTAMPTZ(3) NOT NULL,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "quote_responses_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "quote_responses_quote_id_key" ON "quote_responses"("quote_id");

ALTER TABLE "quote_responses"
  ADD CONSTRAINT "quote_responses_quote_id_fkey"
  FOREIGN KEY ("quote_id") REFERENCES "quotes"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- 12. Créer bookings
CREATE TABLE "bookings" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "service_id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "quote_id" UUID,
  "status" VARCHAR(20) NOT NULL DEFAULT 'CONFIRMED',
  "scheduled_at" TIMESTAMPTZ(3) NOT NULL,
  "duration_min" INTEGER,
  "address" TEXT,
  "total_amount" DECIMAL(12,2) NOT NULL,
  "currency" CHAR(3) NOT NULL DEFAULT 'XOF',
  "notes" TEXT,
  "completed_at" TIMESTAMPTZ(3),
  "canceled_at" TIMESTAMPTZ(3),
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "bookings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "bookings_service_id_scheduled_at_key"
  ON "bookings"("service_id", "scheduled_at");
CREATE UNIQUE INDEX "bookings_quote_id_key" ON "bookings"("quote_id");
CREATE INDEX "bookings_service_id_status_scheduled_at_idx"
  ON "bookings"("service_id", "status", "scheduled_at");
CREATE INDEX "bookings_user_id_status_idx" ON "bookings"("user_id", "status");

ALTER TABLE "bookings"
  ADD CONSTRAINT "bookings_service_id_fkey"
  FOREIGN KEY ("service_id") REFERENCES "services"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "bookings"
  ADD CONSTRAINT "bookings_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "bookings"
  ADD CONSTRAINT "bookings_quote_id_fkey"
  FOREIGN KEY ("quote_id") REFERENCES "quotes"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- 13. Étendre reviews : serviceId, bookingId, orderId devient nullable
ALTER TABLE "reviews"
  ALTER COLUMN "order_id" DROP NOT NULL;

ALTER TABLE "reviews"
  ADD COLUMN "service_id" UUID,
  ADD COLUMN "booking_id" UUID;

ALTER TABLE "reviews"
  ADD CONSTRAINT "reviews_service_id_fkey"
  FOREIGN KEY ("service_id") REFERENCES "services"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "reviews"
  ADD CONSTRAINT "reviews_booking_id_fkey"
  FOREIGN KEY ("booking_id") REFERENCES "bookings"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

CREATE UNIQUE INDEX "reviews_booking_id_key" ON "reviews"("booking_id");
CREATE INDEX "reviews_service_id_rating_idx" ON "reviews"("service_id", "rating");

-- 14. Contrainte : un avis doit cibler AU MOINS une entité
-- (déjà existante, à adapter si nécessaire)
-- Remplacer reviews_target_check par une version qui inclut service_id
ALTER TABLE "reviews" DROP CONSTRAINT IF EXISTS "reviews_target_check";

ALTER TABLE "reviews"
ADD CONSTRAINT "reviews_target_check" CHECK (
  "product_id" IS NOT NULL
  OR "variant_id" IS NOT NULL
  OR "store_id" IS NOT NULL
  OR "professional_id" IS NOT NULL
  OR "service_id" IS NOT NULL
);

-- 15. Contrainte : soit orderId soit bookingId (pas les deux)
ALTER TABLE "reviews"
ADD CONSTRAINT "reviews_source_check" CHECK (
  ("order_id" IS NOT NULL AND "booking_id" IS NULL)
  OR
  ("order_id" IS NULL AND "booking_id" IS NOT NULL)
);