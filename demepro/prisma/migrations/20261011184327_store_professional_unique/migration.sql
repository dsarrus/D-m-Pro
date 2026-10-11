/*
  Warnings:

  - A unique constraint covering the columns `[professional_id]` on the table `stores` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "stores_professional_id_key" ON "stores"("professional_id");
