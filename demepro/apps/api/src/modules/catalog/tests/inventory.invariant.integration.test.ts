// apps/api/src/modules/catalog/services/inventory.invariant.integration.test.ts

import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { PrismaClient } from "../../../generated/prisma/client";

import { startPostgres, stopPostgres } from "../../../../tests/setup/postgres";
import { seedTenant, truncateAll } from "../../../../tests/helpers/factories";

describe("Inventory — contrainte XOR", () => {
  let prisma: PrismaClient;

  beforeAll(async () => {
    const ctx = await startPostgres();
    prisma = ctx.prisma;
  });


  beforeEach(async () => {
    await truncateAll(prisma);
  });

  it("refuse un inventaire avec productId ET variantId", async () => {
    const tenant = await seedTenant(prisma);

    const product = await prisma.product.create({
      data: {
        store: { connect: { id: tenant.storeId } },
        category: { connect: { id: tenant.categoryId } },
        name: "P",
        slug: "p-xor-1",
        hasVariants: true,
        currency: "XOF",
      },
    });

    const variant = await prisma.productVariant.create({
      data: {
        product: { connect: { id: product.id } },
        name: "V",
        price: 1000,
        currency: "XOF",
      },
    });

    // Tentative : les deux à la fois → doit échouer
    await expect(
      prisma.$executeRawUnsafe(`
        INSERT INTO "inventory" ("id", "product_id", "variant_id", "quantity", "reserved", "updated_at")
        VALUES (gen_random_uuid(), '${product.id}'::uuid, '${variant.id}'::uuid, 0, 0, now());
      `),
    ).rejects.toThrow();
  });

  it("refuse un inventaire sans productId ni variantId", async () => {
    await expect(
      prisma.$executeRawUnsafe(`
        INSERT INTO "inventory" ("id", "product_id", "variant_id", "quantity", "reserved", "updated_at")
        VALUES (gen_random_uuid(), NULL, NULL, 0, 0, now());
      `),
    ).rejects.toThrow();
  });

  it("accepte un inventaire avec productId seul", async () => {
    const tenant = await seedTenant(prisma);

    const product = await prisma.product.create({
      data: {
        store: { connect: { id: tenant.storeId } },
        category: { connect: { id: tenant.categoryId } },
        name: "P2",
        slug: "p-xor-2",
        hasVariants: false,
        price: 1000,
        currency: "XOF",
      },
    });

    const inv = await prisma.inventory.create({
      data: {
        product: { connect: { id: product.id } },
        quantity: 0,
        reserved: 0,
      },
    });

    expect(inv.id).toBeDefined();
  });

  it("accepte un inventaire avec variantId seul", async () => {
    const tenant = await seedTenant(prisma);

    const product = await prisma.product.create({
      data: {
        store: { connect: { id: tenant.storeId } },
        category: { connect: { id: tenant.categoryId } },
        name: "P3",
        slug: "p-xor-3",
        hasVariants: true,
        currency: "XOF",
      },
    });

    const variant = await prisma.productVariant.create({
      data: {
        product: { connect: { id: product.id } },
        name: "V3",
        price: 1000,
        currency: "XOF",
      },
    });

    const inv = await prisma.inventory.create({
      data: {
        variant: { connect: { id: variant.id } },
        quantity: 0,
        reserved: 0,
      },
    });

    expect(inv.id).toBeDefined();
  });
});
