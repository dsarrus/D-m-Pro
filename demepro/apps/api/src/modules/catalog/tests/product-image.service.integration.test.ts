// apps/api/src/modules/catalog/services/product-image.service.integration.test.ts

import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";

import { PrismaClient, Prisma } from "../../../generated/prisma/client";
import { startPostgres, stopPostgres } from "../../../../tests/setup/postgres";
import { seedTenant, truncateAll } from "../../../../tests/helpers/factories";

import { ProductService } from "../services/product.service";
import { ProductImageService } from "../services/product-image.service";
import { IdempotencyService } from "../services/idempotency.service";
import { ProductRepository } from "../repositories/product.repository";
import { ProductImageRepository } from "../repositories/product-image.repository";

describe("ProductImageService (integration)", () => {
  let prisma: PrismaClient;
  let productService: ProductService;
  let imageService: ProductImageService;

  beforeAll(async () => {
    const ctx = await startPostgres();
    prisma = ctx.prisma;

    const idempotency = new IdempotencyService(prisma);
    const productRepo = new ProductRepository(prisma);
    const imageRepo = new ProductImageRepository(prisma);

    productService = new ProductService(prisma, productRepo, idempotency);
    imageService = new ProductImageService(prisma, imageRepo);
  });

  


  beforeEach(async () => {
    await truncateAll(prisma);
  });

  /* ================================================================
   * HELPERS
   * ================================================================ */

  async function setupProduct() {
    const tenant = await seedTenant(prisma);
    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    const { product } = await productService.createProduct(
      {
        storeId: tenant.storeId,
        categoryId: tenant.categoryId,
        name: "Produit images",
        slug: `produit-images-${suffix}`,
        status: "DRAFT",
        hasVariants: false,
        price: 1000,
        currency: "XOF",
      },
      { userId: tenant.userId },
    );

    return { tenant, product, suffix };
  }

  /* ================================================================
   * 1. CREATE
   * ================================================================ */

  describe("createImage", () => {
    it("la première image devient automatiquement primaire même avec isPrimary=false", async () => {
      const { tenant, product } = await setupProduct();

      const image = await imageService.createImage(
        product.id,
        {
          objectKey: "products/p1.jpg",
          altText: null,
          sortOrder: 0,
          isPrimary: false,
        },
        { userId: tenant.userId },
      );

      expect(image.isPrimary).toBe(true);
    });

    it("une 2ᵉ image avec isPrimary=false reste non primaire", async () => {
      const { tenant, product } = await setupProduct();

      await imageService.createImage(
        product.id,
        {
          objectKey: "p1.jpg",
          altText: null,
          sortOrder: 0,
          isPrimary: true,
        },
        { userId: tenant.userId },
      );

      const second = await imageService.createImage(
        product.id,
        {
          objectKey: "p2.jpg",
          altText: null,
          sortOrder: 1,
          isPrimary: false,
        },
        { userId: tenant.userId },
      );

      expect(second.isPrimary).toBe(false);
    });

    it("créer une nouvelle primaire démarque l'ancienne", async () => {
      const { tenant, product } = await setupProduct();

      const first = await imageService.createImage(
        product.id,
        {
          objectKey: "p1.jpg",
          altText: null,
          sortOrder: 0,
          isPrimary: true,
        },
        { userId: tenant.userId },
      );

      const second = await imageService.createImage(
        product.id,
        {
          objectKey: "p2.jpg",
          altText: null,
          sortOrder: 1,
          isPrimary: true,
        },
        { userId: tenant.userId },
      );

      expect(second.isPrimary).toBe(true);

      const refreshedFirst = await prisma.productImage.findUnique({
        where: { id: first.id },
      });
      expect(refreshedFirst!.isPrimary).toBe(false);

      const primaries = await prisma.productImage.count({
        where: { productId: product.id, isPrimary: true },
      });
      expect(primaries).toBe(1);
    });

    it("refuse si produit archivé", async () => {
      const { tenant, product } = await setupProduct();

      await productService.archiveProduct(product.id, {
        userId: tenant.userId,
      });

      await expect(
        imageService.createImage(
          product.id,
          {
            objectKey: "p1.jpg",
            altText: null,
            sortOrder: 0,
            isPrimary: false,
          },
          { userId: tenant.userId },
        ),
      ).rejects.toMatchObject({
        code: "INVALID_PRODUCT_STATE",
      });
    });

    it("refuse si l'utilisateur n'est pas propriétaire", async () => {
      const { product } = await setupProduct();
      const otherTenant = await seedTenant(prisma);

      await expect(
        imageService.createImage(
          product.id,
          {
            objectKey: "p1.jpg",
            altText: null,
            sortOrder: 0,
            isPrimary: false,
          },
          { userId: otherTenant.userId },
        ),
      ).rejects.toMatchObject({
        code: "UNAUTHORIZED_STORE",
      });
    });

    it("refuse si le produit n'existe pas", async () => {
      const tenant = await seedTenant(prisma);

      await expect(
        imageService.createImage(
          "00000000-0000-0000-0000-000000000000",
          {
            objectKey: "p1.jpg",
            altText: null,
            sortOrder: 0,
            isPrimary: false,
          },
          { userId: tenant.userId },
        ),
      ).rejects.toMatchObject({
        code: "PRODUCT_NOT_FOUND",
      });
    });
  });

  /* ================================================================
   * 2. UPDATE
   * ================================================================ */

  describe("updateImage", () => {
    it("promouvoir une image démarque l'ancienne primaire", async () => {
      const { tenant, product } = await setupProduct();

      const first = await imageService.createImage(
        product.id,
        {
          objectKey: "p1.jpg",
          altText: null,
          sortOrder: 0,
          isPrimary: true,
        },
        { userId: tenant.userId },
      );

      const second = await imageService.createImage(
        product.id,
        {
          objectKey: "p2.jpg",
          altText: null,
          sortOrder: 1,
          isPrimary: false,
        },
        { userId: tenant.userId },
      );

      await imageService.updateImage(
        second.id,
        { isPrimary: true },
        { userId: tenant.userId },
      );

      const refreshedFirst = await prisma.productImage.findUnique({
        where: { id: first.id },
      });
      expect(refreshedFirst!.isPrimary).toBe(false);

      const primaries = await prisma.productImage.count({
        where: { productId: product.id, isPrimary: true },
      });
      expect(primaries).toBe(1);
    });

    it("refuse de retirer la primaire si aucune autre image", async () => {
      const { tenant, product } = await setupProduct();

      const only = await imageService.createImage(
        product.id,
        {
          objectKey: "p1.jpg",
          altText: null,
          sortOrder: 0,
          isPrimary: true,
        },
        { userId: tenant.userId },
      );

      await expect(
        imageService.updateImage(
          only.id,
          { isPrimary: false },
          { userId: tenant.userId },
        ),
      ).rejects.toMatchObject({
        code: "INVALID_PRODUCT_STATE",
      });
    });

    it("retirer la primaire promeut la suivante automatiquement", async () => {
      const { tenant, product } = await setupProduct();

      const first = await imageService.createImage(
        product.id,
        {
          objectKey: "p1.jpg",
          altText: null,
          sortOrder: 0,
          isPrimary: true,
        },
        { userId: tenant.userId },
      );

      const second = await imageService.createImage(
        product.id,
        {
          objectKey: "p2.jpg",
          altText: null,
          sortOrder: 1,
          isPrimary: false,
        },
        { userId: tenant.userId },
      );

      await imageService.updateImage(
        first.id,
        { isPrimary: false },
        { userId: tenant.userId },
      );

      const refreshedFirst = await prisma.productImage.findUnique({
        where: { id: first.id },
      });
      const refreshedSecond = await prisma.productImage.findUnique({
        where: { id: second.id },
      });

      expect(refreshedFirst!.isPrimary).toBe(false);
      expect(refreshedSecond!.isPrimary).toBe(true);
    });

    it("met à jour altText, objectKey, sortOrder", async () => {
      const { tenant, product } = await setupProduct();

      const image = await imageService.createImage(
        product.id,
        {
          objectKey: "old.jpg",
          altText: "old alt",
          sortOrder: 0,
          isPrimary: true,
        },
        { userId: tenant.userId },
      );

      const updated = await imageService.updateImage(
        image.id,
        {
          objectKey: "new.jpg",
          altText: "new alt",
          sortOrder: 5,
        },
        { userId: tenant.userId },
      );

      expect(updated.objectKey).toBe("new.jpg");
      expect(updated.altText).toBe("new alt");
      expect(updated.sortOrder).toBe(5);
      expect(updated.isPrimary).toBe(true);
    });

    it("refuse si produit archivé", async () => {
      const { tenant, product } = await setupProduct();

      const image = await imageService.createImage(
        product.id,
        {
          objectKey: "p1.jpg",
          altText: null,
          sortOrder: 0,
          isPrimary: true,
        },
        { userId: tenant.userId },
      );

      await productService.archiveProduct(product.id, {
        userId: tenant.userId,
      });

      await expect(
        imageService.updateImage(
          image.id,
          { altText: "test" },
          { userId: tenant.userId },
        ),
      ).rejects.toMatchObject({
        code: "INVALID_PRODUCT_STATE",
      });
    });

    it("refuse si non-propriétaire", async () => {
      const { tenant, product } = await setupProduct();
      const otherTenant = await seedTenant(prisma);

      const image = await imageService.createImage(
        product.id,
        {
          objectKey: "p1.jpg",
          altText: null,
          sortOrder: 0,
          isPrimary: true,
        },
        { userId: tenant.userId },
      );

      await expect(
        imageService.updateImage(
          image.id,
          { altText: "hack" },
          { userId: otherTenant.userId },
        ),
      ).rejects.toMatchObject({
        code: "UNAUTHORIZED_STORE",
      });
    });
  });

  /* ================================================================
   * 3. DELETE
   * ================================================================ */

  describe("deleteImage", () => {
    it("supprime une image non primaire sans promotion", async () => {
      const { tenant, product } = await setupProduct();

      const primary = await imageService.createImage(
        product.id,
        {
          objectKey: "p1.jpg",
          altText: null,
          sortOrder: 0,
          isPrimary: true,
        },
        { userId: tenant.userId },
      );

      const secondary = await imageService.createImage(
        product.id,
        {
          objectKey: "p2.jpg",
          altText: null,
          sortOrder: 1,
          isPrimary: false,
        },
        { userId: tenant.userId },
      );

      const result = await imageService.deleteImage(secondary.id, {
        userId: tenant.userId,
      });

      expect(result.deletedId).toBe(secondary.id);
      expect(result.promotedPrimary).toBeNull();

      const refreshedPrimary = await prisma.productImage.findUnique({
        where: { id: primary.id },
      });
      expect(refreshedPrimary!.isPrimary).toBe(true);
    });

    it("supprimer la primaire promeut la suivante", async () => {
      const { tenant, product } = await setupProduct();

      const primary = await imageService.createImage(
        product.id,
        {
          objectKey: "p1.jpg",
          altText: null,
          sortOrder: 0,
          isPrimary: true,
        },
        { userId: tenant.userId },
      );

      const secondary = await imageService.createImage(
        product.id,
        {
          objectKey: "p2.jpg",
          altText: null,
          sortOrder: 1,
          isPrimary: false,
        },
        { userId: tenant.userId },
      );

      const result = await imageService.deleteImage(primary.id, {
        userId: tenant.userId,
      });

      expect(result.promotedPrimary?.id).toBe(secondary.id);

      const refreshedSecondary = await prisma.productImage.findUnique({
        where: { id: secondary.id },
      });
      expect(refreshedSecondary!.isPrimary).toBe(true);
    });

    it("supprimer la dernière image ne promeut personne", async () => {
      const { tenant, product } = await setupProduct();

      const only = await imageService.createImage(
        product.id,
        {
          objectKey: "p1.jpg",
          altText: null,
          sortOrder: 0,
          isPrimary: true,
        },
        { userId: tenant.userId },
      );

      const result = await imageService.deleteImage(only.id, {
        userId: tenant.userId,
      });

      expect(result.promotedPrimary).toBeNull();

      const count = await prisma.productImage.count({
        where: { productId: product.id },
      });
      expect(count).toBe(0);
    });

    it("refuse si produit archivé", async () => {
      const { tenant, product } = await setupProduct();

      const image = await imageService.createImage(
        product.id,
        {
          objectKey: "p1.jpg",
          altText: null,
          sortOrder: 0,
          isPrimary: true,
        },
        { userId: tenant.userId },
      );

      await productService.archiveProduct(product.id, {
        userId: tenant.userId,
      });

      await expect(
        imageService.deleteImage(image.id, { userId: tenant.userId }),
      ).rejects.toMatchObject({
        code: "INVALID_PRODUCT_STATE",
      });
    });

    it("refuse si non-propriétaire", async () => {
      const { tenant, product } = await setupProduct();
      const otherTenant = await seedTenant(prisma);

      const image = await imageService.createImage(
        product.id,
        {
          objectKey: "p1.jpg",
          altText: null,
          sortOrder: 0,
          isPrimary: true,
        },
        { userId: tenant.userId },
      );

      await expect(
        imageService.deleteImage(image.id, {
          userId: otherTenant.userId,
        }),
      ).rejects.toMatchObject({
        code: "UNAUTHORIZED_STORE",
      });
    });
  });

  /* ================================================================
   * 4. REORDER
   * ================================================================ */

  describe("reorderImages", () => {
    it("réordonne correctement les sortOrder", async () => {
      const { tenant, product } = await setupProduct();

      const a = await imageService.createImage(
        product.id,
        {
          objectKey: "a.jpg",
          altText: null,
          sortOrder: 0,
          isPrimary: true,
        },
        { userId: tenant.userId },
      );

      const b = await imageService.createImage(
        product.id,
        {
          objectKey: "b.jpg",
          altText: null,
          sortOrder: 1,
          isPrimary: false,
        },
        { userId: tenant.userId },
      );

      const c = await imageService.createImage(
        product.id,
        {
          objectKey: "c.jpg",
          altText: null,
          sortOrder: 2,
          isPrimary: false,
        },
        { userId: tenant.userId },
      );

      await imageService.reorderImages(product.id, [c.id, a.id, b.id], {
        userId: tenant.userId,
      });

      const images = await prisma.productImage.findMany({
        where: { productId: product.id },
      });
      const map = new Map(images.map((i) => [i.id, i.sortOrder]));

      expect(map.get(c.id)).toBe(0);
      expect(map.get(a.id)).toBe(1);
      expect(map.get(b.id)).toBe(2);

      // La primaire reste a
      const refreshedA = await prisma.productImage.findUnique({
        where: { id: a.id },
      });
      expect(refreshedA!.isPrimary).toBe(true);
    });

    it("refuse si la liste ne contient pas toutes les images", async () => {
      const { tenant, product } = await setupProduct();

      const a = await imageService.createImage(
        product.id,
        {
          objectKey: "a.jpg",
          altText: null,
          sortOrder: 0,
          isPrimary: true,
        },
        { userId: tenant.userId },
      );

      await imageService.createImage(
        product.id,
        {
          objectKey: "b.jpg",
          altText: null,
          sortOrder: 1,
          isPrimary: false,
        },
        { userId: tenant.userId },
      );

      await expect(
        imageService.reorderImages(product.id, [a.id], {
          userId: tenant.userId,
        }),
      ).rejects.toMatchObject({
        code: "INVALID_PRODUCT_STATE",
      });
    });

    it("refuse si un id n'appartient pas au produit", async () => {
      const { tenant, product } = await setupProduct();
      const { tenant: otherTenant, product: otherProduct } =
        await setupProduct();

      const a = await imageService.createImage(
        product.id,
        {
          objectKey: "a.jpg",
          altText: null,
          sortOrder: 0,
          isPrimary: true,
        },
        { userId: tenant.userId },
      );

      const other = await imageService.createImage(
        otherProduct.id,
        {
          objectKey: "other.jpg",
          altText: null,
          sortOrder: 0,
          isPrimary: true,
        },
        { userId: otherTenant.userId }, // ✅ Propriétaire correct
      );

      await expect(
        imageService.reorderImages(product.id, [a.id, other.id], {
          userId: tenant.userId,
        }),
      ).rejects.toMatchObject({
        code: "PRODUCT_IMAGE_NOT_FOUND",
      });
    });

    it("refuse si produit archivé", async () => {
      const { tenant, product } = await setupProduct();

      const a = await imageService.createImage(
        product.id,
        {
          objectKey: "a.jpg",
          altText: null,
          sortOrder: 0,
          isPrimary: true,
        },
        { userId: tenant.userId },
      );

      await productService.archiveProduct(product.id, {
        userId: tenant.userId,
      });

      await expect(
        imageService.reorderImages(product.id, [a.id], {
          userId: tenant.userId,
        }),
      ).rejects.toMatchObject({
        code: "INVALID_PRODUCT_STATE",
      });
    });
  });

  /* ================================================================
   * 5. CONCURRENCE — cohérence primaire
   * ================================================================ */

  describe("concurrence — invariant primaire", () => {
    it("au plus une image primaire sous 5 créations concurrentes", async () => {
      const { tenant, product } = await setupProduct();

      const results = await Promise.allSettled(
        Array.from({ length: 5 }, (_, i) =>
          imageService.createImage(
            product.id,
            {
              objectKey: `concurrent-${i}.jpg`,
              altText: null,
              sortOrder: i,
              isPrimary: true,
            },
            { userId: tenant.userId },
          ),
        ),
      );

      const fulfilled = results.filter((r) => r.status === "fulfilled");
      const rejected = results.filter((r) => r.status === "rejected");

      // Au moins une création réussit
      expect(fulfilled.length).toBeGreaterThanOrEqual(1);

      // Toutes les rejets sont des conflits de sérialisation épuisés (P2034)
      for (const r of rejected) {
        const error = (r as PromiseRejectedResult).reason;
        expect(error).toBeInstanceOf(Prisma.PrismaClientKnownRequestError);
        expect(error.code).toBe("P2034");
      }

      // L'invariant critique : au plus une primaire en DB
      const primaries = await prisma.productImage.count({
        where: { productId: product.id, isPrimary: true },
      });
      expect(primaries).toBe(1);

      // Le nombre total d'images créées = nombre de succès
      const totalImages = await prisma.productImage.count({
        where: { productId: product.id },
      });
      expect(totalImages).toBe(fulfilled.length);
    });

    it("invariant : suppression concurrente de la primaire → une seule promotion", async () => {
      const { tenant, product } = await setupProduct();

      const primary = await imageService.createImage(
        product.id,
        {
          objectKey: "primary.jpg",
          altText: null,
          sortOrder: 0,
          isPrimary: true,
        },
        { userId: tenant.userId },
      );

      await imageService.createImage(
        product.id,
        {
          objectKey: "b.jpg",
          altText: null,
          sortOrder: 1,
          isPrimary: false,
        },
        { userId: tenant.userId },
      );

      await imageService.createImage(
        product.id,
        {
          objectKey: "c.jpg",
          altText: null,
          sortOrder: 2,
          isPrimary: false,
        },
        { userId: tenant.userId },
      );

      // Deux suppressions simultanées de la même primaire
      const results = await Promise.allSettled([
        imageService.deleteImage(primary.id, { userId: tenant.userId }),
        imageService.deleteImage(primary.id, { userId: tenant.userId }),
      ]);

      const fulfilled = results.filter((r) => r.status === "fulfilled");
      const rejected = results.filter((r) => r.status === "rejected");

      // L'une passe, l'autre échoue (image déjà supprimée)
      expect(fulfilled).toHaveLength(1);
      expect(rejected).toHaveLength(1);

      // Invariant : une seule primaire parmi les images restantes
      const primaries = await prisma.productImage.count({
        where: { productId: product.id, isPrimary: true },
      });
      expect(primaries).toBe(1);
    });
  });

  /* ================================================================
   * 6. LIST
   * ================================================================ */

  describe("listByProduct", () => {
    it("retourne les images triées par isPrimary desc, puis sortOrder", async () => {
      const { tenant, product } = await setupProduct();

      await imageService.createImage(
        product.id,
        {
          objectKey: "secondary.jpg",
          altText: null,
          sortOrder: 0,
          isPrimary: true,
        },
        { userId: tenant.userId },
      );

      await imageService.createImage(
        product.id,
        {
          objectKey: "primary.jpg",
          altText: null,
          sortOrder: 1,
          isPrimary: true,
        },
        { userId: tenant.userId },
      );

      const images = await imageService.listByProduct(product.id, {
        userId: tenant.userId,
      });

      expect(images).toHaveLength(2);
      expect(images[0].isPrimary).toBe(true);
      expect(images[0].objectKey).toBe("primary.jpg");
    });

    it("retourne un tableau vide si aucune image", async () => {
      const { tenant, product } = await setupProduct();

      const images = await imageService.listByProduct(product.id, {
        userId: tenant.userId,
      });

      expect(images).toHaveLength(0);
    });

    it("refuse si non-propriétaire", async () => {
      const { product } = await setupProduct();
      const otherTenant = await seedTenant(prisma);

      await expect(
        imageService.listByProduct(product.id, {
          userId: otherTenant.userId,
        }),
      ).rejects.toMatchObject({
        code: "UNAUTHORIZED_STORE",
      });
    });
  });

  /* ================================================================
   * 7. GET
   * ================================================================ */

  describe("getImage", () => {
    it("retourne une image avec ses relations", async () => {
      const { tenant, product } = await setupProduct();

      const image = await imageService.createImage(
        product.id,
        {
          objectKey: "p1.jpg",
          altText: null,
          sortOrder: 0,
          isPrimary: true,
        },
        { userId: tenant.userId },
      );

      const fetched = await imageService.getImage(image.id);

      expect(fetched.id).toBe(image.id);
      expect(fetched.product).toBeDefined();
      expect(fetched.product.store.professional.userId).toBe(tenant.userId);
    });

    it("refuse si introuvable", async () => {
      await expect(
        imageService.getImage("00000000-0000-0000-0000-000000000000"),
      ).rejects.toMatchObject({
        code: "PRODUCT_IMAGE_NOT_FOUND",
      });
    });
  });
});
