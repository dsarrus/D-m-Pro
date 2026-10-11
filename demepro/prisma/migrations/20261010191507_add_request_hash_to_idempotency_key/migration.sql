/*
  Warnings:

  - Added the required column `request_hash` to the `idempotency_keys` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "idempotency_keys" ADD COLUMN     "request_hash" VARCHAR(64) NOT NULL;
