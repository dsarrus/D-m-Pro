ALTER TABLE "inventory"
ADD CONSTRAINT "inventory_owner_check"
CHECK (
  ("product_id" IS NOT NULL AND "variant_id" IS NULL)
  OR
  ("product_id" IS NULL AND "variant_id" IS NOT NULL)
);