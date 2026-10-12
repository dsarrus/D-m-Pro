-- apps/api/prisma/migrations/20261012_address_default_unique/migration.sql

-- Garantit qu'un user ne peut avoir qu'une seule adresse par défaut
CREATE UNIQUE INDEX "addresses_user_id_default_unique"
  ON "addresses" ("user_id")
  WHERE "is_default" = TRUE;