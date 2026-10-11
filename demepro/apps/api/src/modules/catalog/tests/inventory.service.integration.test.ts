// apps/api/src/modules/catalog/services/inventory.service.integration.test.ts

import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";

import { PrismaClient } from "../../../generated/prisma/client";
import { startPostgres, stopPostgres } from "../../../../tests/setup/postgres";
import { seedTenant, truncateAll } from "../../../../tests/helpers/factories";

import { ProductService } from "../services/product.service";
import { InventoryService } from "../services/inventory.service";
import { IdempotencyService } from "../services/idempotency.service";
import { ProductRepository } from "../repositories/product.repository";
import { InventoryRepository } from "../repositories/inventory.repository";

describe("InventoryService (integration)", () => {
  let prisma: PrismaClient;
  let productService: ProductService;
  let inventoryService: InventoryService;

  beforeAll(async () => {
    const ctx = await startPostgres();
    prisma = ctx.prisma;

    const idempotency = new IdempotencyService(prisma);
    const productRepo = new ProductRepository(prisma);
    const inventoryRepo = new InventoryRepository(prisma);

    productService = new ProductService(prisma, productRepo, idempotency);
    inventoryService = new InventoryService(prisma, inventoryRepo);
  });


  beforeEach(async () => {
    await truncateAll(prisma);
  });

  /* ================================================================
   * HELPERS LOCAUX
   * ================================================================ */

  /**
   * Crée un tenant + produit simple + inventaire initial.
   * Retourne tout ce qu'il faut pour tester.
   */
  async function setupProductWithStock(stock: number): Promise<{
    tenant: {
      userId: string;
      professionalId: string;
      storeId: string;
      categoryId: string;
      verticalId: string;
    };
    productId: string;
    inventoryId: string;
    suffix: string;
  }> {
    const tenant = await seedTenant(prisma);
    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    const { product } = await productService.createFull(
      {
        storeId: tenant.storeId,
        categoryId: tenant.categoryId,
        name: "Produit stock",
        slug: `produit-stock-${suffix}`,
        status: "DRAFT",
        hasVariants: false,
        price: 1000,
        currency: "XOF",
        inventory: stock,
      },
      { userId: tenant.userId },
    );

    const inventory = await prisma.inventory.findUnique({
      where: { productId: product.id },
    });

    if (!inventory) {
      throw new Error("Inventory not created");
    }

    return {
      tenant,
      productId: product.id,
      inventoryId: inventory.id,
      suffix,
    };
  }

  /* ================================================================
   * 1. RÉSERVATION SIMPLE
   * ================================================================ */

  describe("reserve", () => {
    it("réserve du stock disponible", async () => {
      const { inventoryId } = await setupProductWithStock(10);

      const result = await inventoryService.reserve(inventoryId, 3);

      expect(result.reserved).toBe(3);
      expect(result.quantity).toBe(10);
    });

    it("refuse si quantité = 0", async () => {
      const { inventoryId } = await setupProductWithStock(10);

      await expect(
        inventoryService.reserve(inventoryId, 0),
      ).rejects.toMatchObject({
        code: "INVALID_INVENTORY_QUANTITY",
      });
    });

    it("refuse si quantité négative", async () => {
      const { inventoryId } = await setupProductWithStock(10);

      await expect(
        inventoryService.reserve(inventoryId, -5),
      ).rejects.toMatchObject({
        code: "INVALID_INVENTORY_QUANTITY",
      });
    });

    it("refuse si stock insuffisant", async () => {
      const { inventoryId } = await setupProductWithStock(5);

      await expect(
        inventoryService.reserve(inventoryId, 10),
      ).rejects.toMatchObject({
        code: "INVALID_INVENTORY_QUANTITY",
      });
    });

    it("refuse si inventaire introuvable", async () => {
      await expect(
        inventoryService.reserve("00000000-0000-0000-0000-000000000000", 5),
      ).rejects.toMatchObject({
        code: "INVENTORY_NOT_FOUND",
      });
    });

    it("accumule plusieurs réservations jusqu'à épuisement", async () => {
      const { inventoryId } = await setupProductWithStock(10);

      await inventoryService.reserve(inventoryId, 3);
      await inventoryService.reserve(inventoryId, 4);

      const inv = await prisma.inventory.findUnique({
        where: { id: inventoryId },
      });
      expect(inv?.reserved).toBe(7);

      // 3 restant, on demande 4 → refus
      await expect(
        inventoryService.reserve(inventoryId, 4),
      ).rejects.toMatchObject({
        code: "INVALID_INVENTORY_QUANTITY",
      });

      // 3 restant, on demande 3 → OK
      const ok = await inventoryService.reserve(inventoryId, 3);
      expect(ok.reserved).toBe(10);
    });
  });

  /* ================================================================
   * 2. CONCURRENCE — LE TEST CRITIQUE
   * ================================================================ */

  describe("reserve — concurrence", () => {
    it("empêche la survente avec 10 réservations concurrentes de 1 sur stock 5", async () => {
      const { inventoryId } = await setupProductWithStock(5);

      const results = await Promise.allSettled(
        Array.from({ length: 10 }, () =>
          inventoryService.reserve(inventoryId, 1),
        ),
      );

      const fulfilled = results.filter((r) => r.status === "fulfilled");
      const rejected = results.filter((r) => r.status === "rejected");

      // Exactement 5 doivent passer
      expect(fulfilled).toHaveLength(5);
      expect(rejected).toHaveLength(5);

      // Invariant DB
      const inv = await prisma.inventory.findUnique({
        where: { id: inventoryId },
      });
      expect(inv?.reserved).toBe(5);
      expect(inv?.quantity).toBe(5);
      expect(inv!.quantity - inv!.reserved).toBe(0);
    });

    it("empêche la survente avec 20 réservations concurrentes de 2 sur stock 10", async () => {
      const { inventoryId } = await setupProductWithStock(10);

      const results = await Promise.allSettled(
        Array.from({ length: 20 }, () =>
          inventoryService.reserve(inventoryId, 2),
        ),
      );

      const fulfilled = results.filter((r) => r.status === "fulfilled");

      // Exactement 5 doivent passer (5 × 2 = 10)
      expect(fulfilled).toHaveLength(5);

      const inv = await prisma.inventory.findUnique({
        where: { id: inventoryId },
      });
      expect(inv?.reserved).toBe(10);
    });

    it("invariant : reserved <= quantity après rafale concurrente", async () => {
      const { inventoryId } = await setupProductWithStock(7);

      const quantities = [1, 2, 3, 4, 5, 2, 3, 1, 6, 2];

      await Promise.allSettled(
        quantities.map((q) => inventoryService.reserve(inventoryId, q)),
      );

      const inv = await prisma.inventory.findUnique({
        where: { id: inventoryId },
      });

      expect(inv!.reserved).toBeLessThanOrEqual(inv!.quantity);
      expect(inv!.reserved).toBeGreaterThanOrEqual(0);
      expect(inv!.quantity).toBe(7);
    });
  });

  /* ================================================================
   * 3. LIBÉRATION
   * ================================================================ */

  describe("release", () => {
    it("libère une réservation partielle", async () => {
      const { inventoryId } = await setupProductWithStock(10);

      await inventoryService.reserve(inventoryId, 7);
      const released = await inventoryService.release(inventoryId, 3);

      expect(released.reserved).toBe(4);
    });

    it("refuse de libérer plus que réservé", async () => {
      const { inventoryId } = await setupProductWithStock(10);

      await inventoryService.reserve(inventoryId, 3);

      await expect(
        inventoryService.release(inventoryId, 5),
      ).rejects.toMatchObject({
        code: "INVALID_INVENTORY_QUANTITY",
      });
    });

    it("refuse si quantité = 0 ou négative", async () => {
      const { inventoryId } = await setupProductWithStock(10);

      await expect(
        inventoryService.release(inventoryId, 0),
      ).rejects.toMatchObject({
        code: "INVALID_INVENTORY_QUANTITY",
      });

      await expect(
        inventoryService.release(inventoryId, -1),
      ).rejects.toMatchObject({
        code: "INVALID_INVENTORY_QUANTITY",
      });
    });

    it("refuse si inventaire introuvable", async () => {
      await expect(
        inventoryService.release("00000000-0000-0000-0000-000000000000", 1),
      ).rejects.toMatchObject({
        code: "INVENTORY_NOT_FOUND",
      });
    });

    it("concurrence : libérations simultanées ne descendent jamais sous 0", async () => {
      const { inventoryId } = await setupProductWithStock(10);

      await inventoryService.reserve(inventoryId, 5);

      // 10 libérations de 1 → seules 5 doivent passer
      const results = await Promise.allSettled(
        Array.from({ length: 10 }, () =>
          inventoryService.release(inventoryId, 1),
        ),
      );

      const fulfilled = results.filter((r) => r.status === "fulfilled");
      expect(fulfilled).toHaveLength(5);

      const inv = await prisma.inventory.findUnique({
        where: { id: inventoryId },
      });
      expect(inv?.reserved).toBe(0);
      expect(inv!.reserved).toBeGreaterThanOrEqual(0);
    });
  });

  /* ================================================================
   * 4. COMMIT DE RÉSERVATION
   * ================================================================ */

  describe("commitReservation", () => {
    it("décrémente quantity et reserved simultanément", async () => {
      const { inventoryId } = await setupProductWithStock(10);

      await inventoryService.reserve(inventoryId, 3);
      const committed = await inventoryService.commitReservation(
        inventoryId,
        3,
      );

      expect(committed.quantity).toBe(7);
      expect(committed.reserved).toBe(0);
    });

    it("refuse de commit plus que réservé", async () => {
      const { inventoryId } = await setupProductWithStock(10);

      await inventoryService.reserve(inventoryId, 2);

      await expect(
        inventoryService.commitReservation(inventoryId, 5),
      ).rejects.toMatchObject({
        code: "INVALID_INVENTORY_QUANTITY",
      });
    });

    it("refuse si quantité = 0 ou négative", async () => {
      const { inventoryId } = await setupProductWithStock(10);

      await expect(
        inventoryService.commitReservation(inventoryId, 0),
      ).rejects.toMatchObject({
        code: "INVALID_INVENTORY_QUANTITY",
      });

      await expect(
        inventoryService.commitReservation(inventoryId, -1),
      ).rejects.toMatchObject({
        code: "INVALID_INVENTORY_QUANTITY",
      });
    });

    it("refuse si inventaire introuvable", async () => {
      await expect(
        inventoryService.commitReservation(
          "00000000-0000-0000-0000-000000000000",
          1,
        ),
      ).rejects.toMatchObject({
        code: "INVENTORY_NOT_FOUND",
      });
    });

    it("concurrence : 2 commits concurrents de 3 sur réservé 3 → 1 seul passe", async () => {
      const { inventoryId } = await setupProductWithStock(10);

      await inventoryService.reserve(inventoryId, 3);

      const results = await Promise.allSettled([
        inventoryService.commitReservation(inventoryId, 3),
        inventoryService.commitReservation(inventoryId, 3),
      ]);

      const fulfilled = results.filter((r) => r.status === "fulfilled");
      const rejected = results.filter((r) => r.status === "rejected");

      expect(fulfilled).toHaveLength(1);
      expect(rejected).toHaveLength(1);

      const inv = await prisma.inventory.findUnique({
        where: { id: inventoryId },
      });
      expect(inv?.quantity).toBe(7);
      expect(inv?.reserved).toBe(0);
    });
  });

  /* ================================================================
   * 5. INVARIANT GLOBAL
   * ================================================================ */

  describe("invariant global", () => {
    it("après un mélange de reserve/release/commit, reserved <= quantity", async () => {
      const { inventoryId } = await setupProductWithStock(20);

      // Séquence chaotique concurrente
      await Promise.allSettled([
        inventoryService.reserve(inventoryId, 3),
        inventoryService.reserve(inventoryId, 5),
        inventoryService.reserve(inventoryId, 2),
        inventoryService.reserve(inventoryId, 8),
        inventoryService.release(inventoryId, 1), // peut échouer si rien réservé
        inventoryService.reserve(inventoryId, 4),
        inventoryService.reserve(inventoryId, 6),
      ]);

      const inv = await prisma.inventory.findUnique({
        where: { id: inventoryId },
      });

      expect(inv!.reserved).toBeGreaterThanOrEqual(0);
      expect(inv!.reserved).toBeLessThanOrEqual(inv!.quantity);
      expect(inv!.quantity).toBe(20);
    });

    it("quantity - reserved >= 0 toujours après rafale de commits concurrents", async () => {
      const { inventoryId } = await setupProductWithStock(10);

      // Réserver tout
      await inventoryService.reserve(inventoryId, 10);

      // Tenter 10 commits concurrents de 1 → exactement 10 doivent passer
      const results = await Promise.allSettled(
        Array.from({ length: 10 }, () =>
          inventoryService.commitReservation(inventoryId, 1),
        ),
      );

      const fulfilled = results.filter((r) => r.status === "fulfilled");
      expect(fulfilled).toHaveLength(10);

      const inv = await prisma.inventory.findUnique({
        where: { id: inventoryId },
      });
      expect(inv!.quantity).toBe(0);
      expect(inv!.reserved).toBe(0);
      expect(inv!.quantity - inv!.reserved).toBe(0);
    });
  });
});
