-- apps/api/prisma/migrations/20261012130000_service_fix_base_price/migration.sql

-- Renommer "price" en "base_price"
ALTER TABLE "services" RENAME COLUMN "price" TO "base_price";

-- Supprimer "image_key" (déplacé dans ServiceImage)
ALTER TABLE "services" DROP COLUMN IF EXISTS "image_key";