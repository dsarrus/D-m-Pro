-- ================================================================
-- PHASE 5.4 — Payment XOR Order/Booking
-- ================================================================

ALTER TABLE "payments" ALTER COLUMN "order_id" DROP NOT NULL;

ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "booking_id" UUID;

ALTER TABLE "payments" DROP CONSTRAINT IF EXISTS "payments_booking_id_key";
ALTER TABLE "payments" ADD CONSTRAINT "payments_booking_id_key" UNIQUE ("booking_id");

CREATE INDEX IF NOT EXISTS "payments_booking_id_idx" ON "payments"("booking_id");

ALTER TABLE "payments" DROP CONSTRAINT IF EXISTS "payments_booking_id_fkey";
ALTER TABLE "payments" ADD CONSTRAINT "payments_booking_id_fkey"
  FOREIGN KEY ("booking_id") REFERENCES "bookings"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "payments" DROP CONSTRAINT IF EXISTS "payments_xor_order_booking";
ALTER TABLE "payments" ADD CONSTRAINT "payments_xor_order_booking"
  CHECK (
    ((CASE WHEN "order_id" IS NOT NULL THEN 1 ELSE 0 END) +
     (CASE WHEN "booking_id" IS NOT NULL THEN 1 ELSE 0 END)) = 1
  );