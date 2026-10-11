// apps/api/src/modules/catalog/services/product-variant.service.integration.test.ts

import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";

import { PrismaClient } from "../../../generated/prisma/client";
import { startPostgres, stopPostgres } from "../../../../tests/setup/postgres";
import { seedTenant, truncateAll } from "../../../../tests/helpers/factories";

import { ProductService } from "../services/product.service";
import { ProductVariantService } from "../services/product-variant.service";
import { IdempotencyService } from "../services/idempotency.service";
import { ProductRepository } from "../repositories/product.repository";
import { ProductVariantRepository } from "../repositories/product-variant.repository";

describe("ProductVariantService (integration)", () => {
  let prisma: PrismaClient;
  let productService: ProductService;
  let variantService: ProductVariantService;

  beforeAll(async () => {
    const ctx = await startPostgres();
    prisma = ctx.prisma;

    const idempotency = new IdempotencyService(prisma);
    const productRepo = new ProductRepository(prisma);
    const variantRepo = new ProductVariantRepository(prisma);

    productService = new ProductService(prisma, productRepo, idempotency);
    variantService = new ProductVariantService(
      prisma,
      variantRepo,
      idempotency,
    );
  });
  afterAll(async () => {
    await stopPostgres();
  });

  beforeEach(async () => {
    await truncateAll(prisma);
  });

  /* ================================================================
   * HELPERS
   * ================================================================ */

  async function setupProductWithVariants() {
    const tenant = await seedTenant(prisma);
    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    const { product } = await productService.createFull(
      {
        storeId: tenant.storeId,
        categoryId: tenant.categoryId,
        name: "Produit à variantes",
        slug: `produit-${suffix}`,
        status: "DRAFT",
        hasVariants: true,
        currency: "XOF",
        variants: [
          {
            name: "41",
            sku: `V-41-${suffix}`,
            price: 15000,
            inventory: 5,
          },
        ],
      },
      { userId: tenant.userId },
    );

    return { tenant, product, suffix };
  }

  /* ================================================================
   * 1. CREATE
   * ================================================================ */

  describe("createVariant", () => {
    it("crée une variante + inventaire", async () => {
      const { tenant, product, suffix } = await setupProductWithVariants();

      const result = await variantService.createVariant(
        product.id,
        {
          name: "42",
          sku: `V-42-${suffix}`,
          price: 15000,
          currency: "XOF",
          attributes: null,
          isActive: true,
          inventory: 8,
        },
        { userId: tenant.userId },
      );

      expect(result.variant.name).toBe("42");
      expect(result.inventory.quantity).toBe(8);
      expect(result.inventory.reserved).toBe(0);
      expect(result.product.id).toBe(product.id);
    });

    it("refuse si le produit n'a pas hasVariants = true", async () => {
      const tenant = await seedTenant(prisma);
      const suffix = `${Date.now()}`;

      const { product } = await productService.createProduct(
        {
          storeId: tenant.storeId,
          categoryId: tenant.categoryId,
          name: "Produit simple",
          slug: `simple-${suffix}`,
          status: "DRAFT",
          hasVariants: false,
          price: 1000,
          currency: "XOF",
        },
        { userId: tenant.userId },
      );

      await expect(
        variantService.createVariant(
          product.id,
          {
            name: "V1",
            sku: `SKU-${suffix}`,
            price: 1000,
            currency: "XOF",
            attributes: null,
            isActive: true,
            inventory: 0,
          },
          { userId: tenant.userId },
        ),
      ).rejects.toMatchObject({
        code: "PRODUCT_HAS_NO_VARIANTS",
      });
    });

    it("refuse si le SKU est déjà utilisé", async () => {
      const { tenant, product, suffix } = await setupProductWithVariants();

      const existing = await prisma.productVariant.findFirst({
        where: { productId: product.id },
      });

      await expect(
        variantService.createVariant(
          product.id,
          {
            name: "Doublon",
            sku: existing!.sku,
            price: 1000,
            currency: "XOF",
            attributes: null,
            isActive: true,
            inventory: 0,
          },
          { userId: tenant.userId },
        ),
      ).rejects.toMatchObject({
        code: "DUPLICATE_SKU",
      });
    });

    it("refuse si le produit est archivé", async () => {
      const { tenant, product, suffix } = await setupProductWithVariants();

      await productService.archiveProduct(product.id, {
        userId: tenant.userId,
      });

      await expect(
        variantService.createVariant(
          product.id,
          {
            name: "V",
            sku: `SKU-${suffix}`,
            price: 1000,
            currency: "XOF",
            attributes: null,
            isActive: true,
            inventory: 0,
          },
          { userId: tenant.userId },
        ),
      ).rejects.toMatchObject({
        code: "INVALID_PRODUCT_STATE",
      });
    });

    it("refuse si l'utilisateur n'est pas propriétaire", async () => {
      const { product, suffix } = await setupProductWithVariants();
      const otherTenant = await seedTenant(prisma);

      await expect(
        variantService.createVariant(
          product.id,
          {
            name: "V",
            sku: `SKU-${suffix}-other`,
            price: 1000,
            currency: "XOF",
            attributes: null,
            isActive: true,
            inventory: 0,
          },
          { userId: otherTenant.userId },
        ),
      ).rejects.toMatchObject({
        code: "UNAUTHORIZED_STORE",
      });
    });
  });

  /* ================================================================
   * 2. IDEMPOTENCE
   * ================================================================ */

  describe("createVariant — idempotence", () => {
    it("ne crée qu'une variante avec la même Idempotency-Key", async () => {
      const { tenant, product, suffix } = await setupProductWithVariants();

      const dto = {
        name: "42",
        sku: `V-42-${suffix}`,
        price: 15000,
        currency: "XOF" as const,
        attributes: null,
        isActive: true,
        inventory: 8,
      };

      const key = "variant-idem-key-1";

      const first = await variantService.createVariant(
        product.id,
        dto,
        { userId: tenant.userId },
        key,
      );
      const second = await variantService.createVariant(
        product.id,
        dto,
        { userId: tenant.userId },
        key,
      );

      expect(first.variant.id).toBe(second.variant.id);

      const count = await prisma.productVariant.count({
        where: { productId: product.id },
      });
      expect(count).toBe(2); // 41 initial + 42
    });

    it("rejette si la clé existe avec un payload différent", async () => {
      const { tenant, product, suffix } = await setupProductWithVariants();

      const baseDto = {
        name: "42",
        sku: `V-42-${suffix}`,
        price: 15000,
        currency: "XOF" as const,
        attributes: null,
        isActive: true,
        inventory: 8,
      };

      await variantService.createVariant(
        product.id,
        baseDto,
        { userId: tenant.userId },
        "variant-idem-conflict",
      );

      await expect(
        variantService.createVariant(
          product.id,
          { ...baseDto, name: "43", sku: `V-43-${suffix}` },
          { userId: tenant.userId },
          "variant-idem-conflict",
        ),
      ).rejects.toMatchObject({
        code: "IDEMPOTENCY_CONFLICT",
      });
    });
  });

  /* ================================================================
   * 3. UPDATE
   * ================================================================ */

  describe("updateVariant", () => {
    it("met à jour name et price", async () => {
      const { tenant, product } = await setupProductWithVariants();

      const variant = await prisma.productVariant.findFirst({
        where: { productId: product.id },
      });

      const updated = await variantService.updateVariant(
        variant!.id,
        { name: "Renommé", price: 20000 },
        { userId: tenant.userId },
      );

      expect(updated.name).toBe("Renommé");
      expect(updated.price.toString()).toBe("20000");
    });

    it("refuse un SKU déjà utilisé", async () => {
      const { tenant, product, suffix } = await setupProductWithVariants();

      const existing = await prisma.productVariant.findFirst({
        where: { productId: product.id },
      });

      const other = await variantService.createVariant(
        product.id,
        {
          name: "Autre",
          sku: `AUTRE-${suffix}`,
          price: 1000,
          currency: "XOF",
          attributes: null,
          isActive: true,
          inventory: 0,
        },
        { userId: tenant.userId },
      );

      await expect(
        variantService.updateVariant(
          other.variant.id,
          { sku: existing!.sku },
          { userId: tenant.userId },
        ),
      ).rejects.toMatchObject({
        code: "DUPLICATE_SKU",
      });
    });

    it("permet de garder le même SKU", async () => {
      const { tenant, product } = await setupProductWithVariants();

      const variant = await prisma.productVariant.findFirst({
        where: { productId: product.id },
      });

      const updated = await variantService.updateVariant(
        variant!.id,
        { sku: variant!.sku },
        { userId: tenant.userId },
      );

      expect(updated.sku).toBe(variant!.sku);
    });
  });

  /* ================================================================
   * 4. ACTIVATE / DEACTIVATE
   * ================================================================ */

  describe("activateVariant / deactivateVariant", () => {
    it("désactive une variante si d'autres sont actives", async () => {
      const { tenant, product, suffix } = await setupProductWithVariants();

      await variantService.createVariant(
        product.id,
        {
          name: "42",
          sku: `V-42-${suffix}`,
          price: 15000,
          currency: "XOF",
          attributes: null,
          isActive: true,
          inventory: 5,
        },
        { userId: tenant.userId },
      );

      const first = await prisma.productVariant.findFirst({
        where: { productId: product.id, isActive: true },
        orderBy: { createdAt: "asc" },
      });

      const deactivated = await variantService.deactivateVariant(first!.id, {
        userId: tenant.userId,
      });

      expect(deactivated.isActive).toBe(false);
    });

    it("refuse de désactiver la dernière variante active", async () => {
      const { tenant, product } = await setupProductWithVariants();

      const only = await prisma.productVariant.findFirst({
        where: { productId: product.id, isActive: true },
      });

      await expect(
        variantService.deactivateVariant(only!.id, {
          userId: tenant.userId,
        }),
      ).rejects.toMatchObject({
        code: "LAST_ACTIVE_VARIANT",
      });
    });

    it("activate réactive une variante désactivée", async () => {
      const { tenant, product, suffix } = await setupProductWithVariants();

      await variantService.createVariant(
        product.id,
        {
          name: "42",
          sku: `V-42-${suffix}`,
          price: 15000,
          currency: "XOF",
          attributes: null,
          isActive: true,
          inventory: 5,
        },
        { userId: tenant.userId },
      );

      const first = await prisma.productVariant.findFirst({
        where: { productId: product.id, isActive: true },
        orderBy: { createdAt: "asc" },
      });

      await variantService.deactivateVariant(first!.id, {
        userId: tenant.userId,
      });

      const reactivated = await variantService.activateVariant(first!.id, {
        userId: tenant.userId,
      });

      expect(reactivated.isActive).toBe(true);
    });
  });

  /* ================================================================
   * 5. DELETE
   * ================================================================ */

  describe("deleteVariant", () => {
    it("refuse si des réservations sont actives", async () => {
      const { tenant, product } = await setupProductWithVariants();

      const variant = await prisma.productVariant.findFirst({
        where: { productId: product.id },
      });

      await prisma.inventory.update({
        where: { variantId: variant!.id },
        data: { reserved: 2 },
      });

      await expect(
        variantService.deleteVariant(variant!.id, {
          userId: tenant.userId,
        }),
      ).rejects.toMatchObject({
        code: "INVALID_INVENTORY_QUANTITY",
      });
    });

    it("supprime la variante sinon", async () => {
      const { tenant, product } = await setupProductWithVariants();

      const variant = await prisma.productVariant.findFirst({
        where: { productId: product.id },
      });

      await variantService.deleteVariant(variant!.id, {
        userId: tenant.userId,
      });

      const refreshed = await prisma.productVariant.findUnique({
        where: { id: variant!.id },
      });
      expect(refreshed).toBeNull();
    });

    it("refuse si produit archivé", async () => {
      const { tenant, product } = await setupProductWithVariants();

      const variant = await prisma.productVariant.findFirst({
        where: { productId: product.id },
      });

      await productService.archiveProduct(product.id, {
        userId: tenant.userId,
      });

      await expect(
        variantService.deleteVariant(variant!.id, {
          userId: tenant.userId,
        }),
      ).rejects.toMatchObject({
        code: "INVALID_PRODUCT_STATE",
      });
    });
  });

  /* ================================================================
   * 6. CONCURRENCE SKU
   * ================================================================ */

  describe("createVariant — concurrence SKU", () => {
    it("rejette deux créations concurrentes avec le même SKU", async () => {
      const { tenant, product, suffix } = await setupProductWithVariants();

      const dto = {
        name: "Concurrent",
        sku: `CONCURRENT-${suffix}`,
        price: 15000,
        currency: "XOF" as const,
        attributes: null,
        isActive: true,
        inventory: 5,
      };

      const [a, b] = await Promise.allSettled([
        variantService.createVariant(product.id, dto, {
          userId: tenant.userId,
        }),
        variantService.createVariant(product.id, dto, {
          userId: tenant.userId,
        }),
      ]);

      const fulfilled = [a, b].filter((r) => r.status === "fulfilled");
      const rejected = [a, b].filter((r) => r.status === "rejected");

      expect(fulfilled).toHaveLength(1);
      expect(rejected).toHaveLength(1);

      const rejectedError = (rejected[0] as PromiseRejectedResult).reason;
      expect(rejectedError.code).toBe("DUPLICATE_SKU");

      const count = await prisma.productVariant.count({
        where: { sku: `CONCURRENT-${suffix}` },
      });
      expect(count).toBe(1);
    });
  });

  /* ================================================================
   * 7. LIST
   * ================================================================ */

  describe("listByProduct", () => {
    it("retourne les variantes triées par createdAt", async () => {
      const { tenant, product, suffix } = await setupProductWithVariants();

      await variantService.createVariant(
        product.id,
        {
          name: "42",
          sku: `V-42-${suffix}`,
          price: 15000,
          currency: "XOF",
          attributes: null,
          isActive: true,
          inventory: 5,
        },
        { userId: tenant.userId },
      );

      const variants = await variantService.listByProduct(product.id, {
        userId: tenant.userId,
      });

      expect(variants).toHaveLength(2);
      expect(variants[0].name).toBe("41");
      expect(variants[1].name).toBe("42");
    });

    it("refuse si l'utilisateur n'est pas propriétaire", async () => {
      const { product } = await setupProductWithVariants();
      const otherTenant = await seedTenant(prisma);

      await expect(
        variantService.listByProduct(product.id, {
          userId: otherTenant.userId,
        }),
      ).rejects.toMatchObject({
        code: "UNAUTHORIZED_STORE",
      });
    });
  });
});
