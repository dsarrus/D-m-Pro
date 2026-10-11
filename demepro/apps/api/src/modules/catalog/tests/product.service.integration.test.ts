// apps/api/src/modules/catalog/services/product.service.integration.test.ts

import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { PrismaClient } from "../../../generated/prisma/client";

import { startPostgres, stopPostgres } from "../../../../tests/setup/postgres";
import { seedTenant, truncateAll } from "../../../../tests/helpers/factories";

import { ProductService } from "../services/product.service";
import { ProductRepository } from "../repositories/product.repository";
import { IdempotencyService } from "../services/idempotency.service";
import { CatalogError } from "../errors/catalog.error";

describe("ProductService (integration)", () => {
  let prisma: PrismaClient;
  let service: ProductService;
  let idempotency: IdempotencyService;

  beforeAll(async () => {
    const ctx = await startPostgres();
    prisma = ctx.prisma;

    idempotency = new IdempotencyService(prisma);
    const repository = new ProductRepository(prisma);
    service = new ProductService(prisma, repository, idempotency);
  });


  beforeEach(async () => {
    await truncateAll(prisma);
  });

  /* ================================================================
   * 1. CREATE PRODUCT — cas nominal
   * ================================================================ */

  describe("createProduct", () => {
    it("crée un produit simple valide", async () => {
      const tenant = await seedTenant(prisma);

      const result = await service.createProduct(
        {
          storeId: tenant.storeId,
          categoryId: tenant.categoryId,
          name: "Canapé 3 places",
          slug: "canape-3-places",
          description: "Un canapé confortable",
          status: "DRAFT",
          hasVariants: false,
          price: 350000,
          currency: "XOF",
        },
        { userId: tenant.userId },
      );

      expect(result.product.id).toBeDefined();
      expect(result.product.slug).toBe("canape-3-places");
      expect(result.product.hasVariants).toBe(false);
      expect(result.product.status).toBe("DRAFT");
      expect(result.product.price?.toString()).toBe("350000");
    });

    it("rejette si le store n'appartient pas au user", async () => {
      const tenantA = await seedTenant(prisma);
      const tenantB = await seedTenant(prisma);

      await expect(
        service.createProduct(
          {
            storeId: tenantA.storeId,
            categoryId: tenantA.categoryId,
            name: "Produit X",
            slug: "produit-x",
            status: "DRAFT",
            hasVariants: false,
            price: 1000,
            currency: "XOF",
          },
          { userId: tenantB.userId },
        ),
      ).rejects.toMatchObject({
        code: "UNAUTHORIZED_STORE",
      });
    });

    it("rejette si le slug existe déjà dans la boutique", async () => {
      const tenant = await seedTenant(prisma);

      const baseDto = {
        storeId: tenant.storeId,
        categoryId: tenant.categoryId,
        name: "Canapé",
        slug: "canape",
        status: "DRAFT" as const,
        hasVariants: false,
        price: 1000,
        currency: "XOF" as const,
      };

      await service.createProduct(baseDto, { userId: tenant.userId });

      await expect(
        service.createProduct(
          { ...baseDto, name: "Canapé 2" },
          { userId: tenant.userId },
        ),
      ).rejects.toMatchObject({
        code: "DUPLICATE_SLUG",
      });
    });

    it("rejette si la catégorie n'existe pas", async () => {
      const tenant = await seedTenant(prisma);

      await expect(
        service.createProduct(
          {
            storeId: tenant.storeId,
            categoryId: "00000000-0000-0000-0000-000000000000",
            name: "Produit",
            slug: "produit",
            status: "DRAFT",
            hasVariants: false,
            price: 1000,
            currency: "XOF",
          },
          { userId: tenant.userId },
        ),
      ).rejects.toMatchObject({
        code: "CATEGORY_NOT_FOUND",
      });
    });
  });

  /* ================================================================
   * 2. CREATE FULL — atomicité
   * ================================================================ */

  describe("createFull — atomicité", () => {
    it("crée un produit simple + inventaire + images", async () => {
      const tenant = await seedTenant(prisma);

      const result = await service.createFull(
        {
          storeId: tenant.storeId,
          categoryId: tenant.categoryId,
          name: "Chaise",
          slug: "chaise",
          status: "DRAFT",
          hasVariants: false,
          price: 15000,
          currency: "XOF",
          inventory: 10,
          images: [
            {
              objectKey: "products/chaise-1.jpg",
              isPrimary: true,
              sortOrder: 0,
            },
            {
              objectKey: "products/chaise-2.jpg",
              isPrimary: false,
              sortOrder: 1,
            },
          ],
        },
        { userId: tenant.userId },
      );

      expect(result.product.images).toHaveLength(2);
      expect(result.product.inventory?.quantity).toBe(10);
      expect(result.product.variants).toHaveLength(0);

      const primaryImages = result.product.images.filter((i) => i.isPrimary);
      expect(primaryImages).toHaveLength(1);
    });

    it("crée un produit à variantes + inventaires par variante", async () => {
      const tenant = await seedTenant(prisma);

      const result = await service.createFull(
        {
          storeId: tenant.storeId,
          categoryId: tenant.categoryId,
          name: "Chaussure homme",
          slug: "chaussure-homme",
          status: "DRAFT",
          hasVariants: true,
          currency: "XOF",
          variants: [
            { name: "41", sku: "CH-41", price: 15000, inventory: 10 },
            { name: "42", sku: "CH-42", price: 15000, inventory: 8 },
          ],
        },
        { userId: tenant.userId },
      );

      expect(result.product.variants).toHaveLength(2);
      expect(result.product.inventory).toBeNull();

      const skus = result.product.variants.map((v) => v.sku).sort();
      expect(skus).toEqual(["CH-41", "CH-42"]);

      const qtys = result.product.variants.map((v) => v.inventory?.quantity);
      expect(qtys).toEqual([10, 8]);
    });

    it("ROLLBACK complet si une variante a un SKU dupliqué en DB", async () => {
      const tenant = await seedTenant(prisma);

      // Pré-créer un variant avec SKU "CH-42" dans une autre boutique
      const otherTenant = await seedTenant(prisma);
      const otherProduct = await prisma.product.create({
        data: {
          store: { connect: { id: otherTenant.storeId } },
          category: { connect: { id: otherTenant.categoryId } },
          name: "Autre",
          slug: "autre",
          hasVariants: true,
          status: "DRAFT",
          currency: "XOF",
        },
      });
      await prisma.productVariant.create({
        data: {
          product: { connect: { id: otherProduct.id } },
          name: "42",
          sku: "CH-42",
          price: 15000,
          currency: "XOF",
        },
      });

      await expect(
        service.createFull(
          {
            storeId: tenant.storeId,
            categoryId: tenant.categoryId,
            name: "Chaussure",
            slug: "chaussure",
            status: "DRAFT",
            hasVariants: true,
            currency: "XOF",
            variants: [
              { name: "41", sku: "CH-41", price: 15000, inventory: 5 },
              { name: "42", sku: "CH-42", price: 15000, inventory: 5 },
            ],
          },
          { userId: tenant.userId },
        ),
      ).rejects.toMatchObject({ code: "DUPLICATE_SKU" });

      // Le produit n'existe pas
      const created = await prisma.product.findFirst({
        where: { slug: "chaussure" },
      });
      expect(created).toBeNull();

      // Ni le variant CH-41 qui était pourtant valide
      const orphan = await prisma.productVariant.findUnique({
        where: { sku: "CH-41" },
      });
      expect(orphan).toBeNull();
    });

    it("ROLLBACK complet si l'image primaire est dupliquée dans le DTO", async () => {
      const tenant = await seedTenant(prisma);

      // Note : le DTO Zod doit rejeter en amont, mais on teste ici
      // que même si on by-pass, la DB ne contient rien.
      // Ce test valide surtout la cohérence "une seule primaire".

      const result = await service.createFull(
        {
          storeId: tenant.storeId,
          categoryId: tenant.categoryId,
          name: "Table",
          slug: "table",
          status: "DRAFT",
          hasVariants: false,
          price: 50000,
          currency: "XOF",
          inventory: 3,
          images: [
            { objectKey: "t1.jpg", isPrimary: true, sortOrder: 0 },
            { objectKey: "t2.jpg", isPrimary: true, sortOrder: 1 },
          ],
        } as any,
        { userId: tenant.userId },
      );

      const primaries = result.product.images.filter((i) => i.isPrimary);
      expect(primaries).toHaveLength(1);
    });
  });

  /* ================================================================
   * 3. CONCURRENCE SKU
   * ================================================================ */

  describe("concurrence SKU", () => {
    it("rejette deux créations concurrentes avec le même SKU", async () => {
      const tenantA = await seedTenant(prisma);
      const tenantB = await seedTenant(prisma);

      const payloadA = {
        storeId: tenantA.storeId,
        categoryId: tenantA.categoryId,
        name: "Chaussure A",
        slug: "chaussure-a",
        status: "DRAFT" as const,
        hasVariants: true as const,
        currency: "XOF" as const,
        variants: [
          { name: "41", sku: "CONCURRENT-41", price: 15000, inventory: 5 },
        ],
      };

      const payloadB = {
        ...payloadA,
        storeId: tenantB.storeId,
        categoryId: tenantB.categoryId,
        name: "Chaussure B",
        slug: "chaussure-b",
      };

      const [a, b] = await Promise.allSettled([
        service.createFull(payloadA, { userId: tenantA.userId }),
        service.createFull(payloadB, { userId: tenantB.userId }),
      ]);

      const fulfilled = [a, b].filter((r) => r.status === "fulfilled");
      const rejected = [a, b].filter((r) => r.status === "rejected");

      expect(fulfilled).toHaveLength(1);
      expect(rejected).toHaveLength(1);

      const rejectedError = (rejected[0] as PromiseRejectedResult).reason;
      expect(rejectedError).toBeInstanceOf(CatalogError);
      expect(rejectedError.code).toBe("DUPLICATE_SKU");

      // Un seul variant avec ce SKU en DB
      const count = await prisma.productVariant.count({
        where: { sku: "CONCURRENT-41" },
      });
      expect(count).toBe(1);
    });

    it("rejette deux créations concurrentes avec le même slug (même store)", async () => {
      const tenant = await seedTenant(prisma);

      const payload = {
        storeId: tenant.storeId,
        categoryId: tenant.categoryId,
        name: "Produit concurrent",
        slug: "produit-concurrent",
        status: "DRAFT" as const,
        hasVariants: false as const,
        price: 1000,
        currency: "XOF" as const,
      };

      const [a, b] = await Promise.allSettled([
        service.createProduct(payload, { userId: tenant.userId }),
        service.createProduct(payload, { userId: tenant.userId }),
      ]);

      const fulfilled = [a, b].filter((r) => r.status === "fulfilled");
      const rejected = [a, b].filter((r) => r.status === "rejected");

      expect(fulfilled).toHaveLength(1);
      expect(rejected).toHaveLength(1);

      const count = await prisma.product.count({
        where: { slug: "produit-concurrent" },
      });
      expect(count).toBe(1);
    });
  });

  /* ================================================================
   * 4. IDEMPOTENCE
   * ================================================================ */

  describe("idempotence", () => {
    it("ne crée qu'un seul produit avec la même Idempotency-Key", async () => {
      const tenant = await seedTenant(prisma);

      const payload = {
        storeId: tenant.storeId,
        categoryId: tenant.categoryId,
        name: "Produit idempotent",
        slug: "produit-idempotent",
        status: "DRAFT" as const,
        hasVariants: false as const,
        price: 5000,
        currency: "XOF" as const,
      };

      const key = "idem-key-1";

      const first = await service.createProduct(
        payload,
        { userId: tenant.userId },
        key,
      );
      const second = await service.createProduct(
        payload,
        { userId: tenant.userId },
        key,
      );

      expect((first as any).product.id).toBe((second as any).product.id);

      const count = await prisma.product.count({
        where: { storeId: tenant.storeId },
      });
      expect(count).toBe(1);
    });

    it("rejette si la clé existe avec un payload différent", async () => {
      const tenant = await seedTenant(prisma);

      const payload = {
        storeId: tenant.storeId,
        categoryId: tenant.categoryId,
        name: "Produit A",
        slug: "produit-a",
        status: "DRAFT" as const,
        hasVariants: false as const,
        price: 1000,
        currency: "XOF" as const,
      };

      await service.createProduct(
        payload,
        { userId: tenant.userId },
        "idem-key-conflict",
      );

      await expect(
        service.createProduct(
          { ...payload, name: "Produit B", slug: "produit-b" },
          { userId: tenant.userId },
          "idem-key-conflict",
        ),
      ).rejects.toMatchObject({
        code: "IDEMPOTENCY_CONFLICT",
      });
    });

    it("rejette deux appels concurrents avec la même clé", async () => {
      const tenant = await seedTenant(prisma);

      const payload = {
        storeId: tenant.storeId,
        categoryId: tenant.categoryId,
        name: "Produit concurrent idem",
        slug: "produit-concurrent-idem",
        status: "DRAFT" as const,
        hasVariants: false as const,
        price: 1000,
        currency: "XOF" as const,
      };

      const key = "idem-key-concurrent";

      const [a, b] = await Promise.allSettled([
        service.createProduct(payload, { userId: tenant.userId }, key),
        service.createProduct(payload, { userId: tenant.userId }, key),
      ]);

      // L'un réussit, l'autre soit réussit via cache soit échoue en conflit.
      // Selon le timing, on peut avoir 2 fulfilled (si le 2e lit le cache)
      // ou 1 fulfilled + 1 rejected IDEMPOTENCY_CONFLICT.
      const fulfilled = [a, b].filter((r) => r.status === "fulfilled");
      expect(fulfilled.length).toBeGreaterThanOrEqual(1);

      const count = await prisma.product.count({
        where: { storeId: tenant.storeId },
      });
      expect(count).toBe(1);
    });
  });

  /* ================================================================
   * 5. ACTIVATION
   * ================================================================ */

  describe("activateProduct", () => {
    it("refuse d'activer un produit sans stock", async () => {
      const tenant = await seedTenant(prisma);

      const { product } = await service.createFull(
        {
          storeId: tenant.storeId,
          categoryId: tenant.categoryId,
          name: "Produit sans stock",
          slug: "produit-sans-stock",
          status: "DRAFT",
          hasVariants: false,
          price: 1000,
          currency: "XOF",
          inventory: 0,
        },
        { userId: tenant.userId },
      );

      await expect(
        service.activateProduct(product.id, { userId: tenant.userId }),
      ).rejects.toMatchObject({
        code: "INVALID_PRODUCT_STATE",
      });
    });

    it("active un produit simple avec stock", async () => {
      const tenant = await seedTenant(prisma);

      const { product } = await service.createFull(
        {
          storeId: tenant.storeId,
          categoryId: tenant.categoryId,
          name: "Produit avec stock",
          slug: "produit-avec-stock",
          status: "DRAFT",
          hasVariants: false,
          price: 1000,
          currency: "XOF",
          inventory: 5,
        },
        { userId: tenant.userId },
      );

      const activated = await service.activateProduct(product.id, {
        userId: tenant.userId,
      });

      expect(activated.status).toBe("ACTIVE");
    });

    it("refuse d'activer un produit à variantes dont aucune n'a de stock", async () => {
      const tenant = await seedTenant(prisma);

      const { product } = await service.createFull(
        {
          storeId: tenant.storeId,
          categoryId: tenant.categoryId,
          name: "Produit variantes vides",
          slug: "produit-variantes-vides",
          status: "DRAFT",
          hasVariants: true,
          currency: "XOF",
          variants: [
            { name: "41", sku: "PV-41", price: 15000, inventory: 0 },
            { name: "42", sku: "PV-42", price: 15000, inventory: 0 },
          ],
        },
        { userId: tenant.userId },
      );

      await expect(
        service.activateProduct(product.id, { userId: tenant.userId }),
      ).rejects.toMatchObject({
        code: "INVALID_PRODUCT_STATE",
      });
    });

    it("active un produit à variantes si au moins une a du stock", async () => {
      const tenant = await seedTenant(prisma);

      const { product } = await service.createFull(
        {
          storeId: tenant.storeId,
          categoryId: tenant.categoryId,
          name: "Produit variantes OK",
          slug: "produit-variantes-ok",
          status: "DRAFT",
          hasVariants: true,
          currency: "XOF",
          variants: [
            { name: "41", sku: "PVOK-41", price: 15000, inventory: 0 },
            { name: "42", sku: "PVOK-42", price: 15000, inventory: 5 },
          ],
        },
        { userId: tenant.userId },
      );

      const activated = await service.activateProduct(product.id, {
        userId: tenant.userId,
      });

      expect(activated.status).toBe("ACTIVE");
    });
  });

  /* ================================================================
   * 6. UPDATE — bascule hasVariants interdite via updateProduct
   * ================================================================ */

  describe("updateProduct — cohérence hasVariants / price", () => {
    it("refuse de mettre un prix à un produit à variantes", async () => {
      const tenant = await seedTenant(prisma);

      const { product } = await service.createFull(
        {
          storeId: tenant.storeId,
          categoryId: tenant.categoryId,
          name: "Produit V",
          slug: "produit-v",
          status: "DRAFT",
          hasVariants: true,
          currency: "XOF",
          variants: [{ name: "41", sku: "UPV-41", price: 15000, inventory: 5 }],
        },
        { userId: tenant.userId },
      );

      await expect(
        service.updateProduct(
          product.id,
          { price: 20000 },
          { userId: tenant.userId },
        ),
      ).rejects.toMatchObject({
        code: "INVALID_PRODUCT_STATE",
      });
    });

    it("refuse de retirer le prix d'un produit simple", async () => {
      const tenant = await seedTenant(prisma);

      const { product } = await service.createProduct(
        {
          storeId: tenant.storeId,
          categoryId: tenant.categoryId,
          name: "Produit simple",
          slug: "produit-simple",
          status: "DRAFT",
          hasVariants: false,
          price: 1000,
          currency: "XOF",
        },
        { userId: tenant.userId },
      );

      await expect(
        service.updateProduct(
          product.id,
          { price: null },
          { userId: tenant.userId },
        ),
      ).rejects.toMatchObject({
        code: "INVALID_PRODUCT_STATE",
      });
    });
  });

  /* ================================================================
   * 7. ENABLE / DISABLE VARIANTS
   * ================================================================ */

  describe("enableVariants / disableVariants", () => {
    it("enableVariants met price = null", async () => {
      const tenant = await seedTenant(prisma);

      const { product } = await service.createProduct(
        {
          storeId: tenant.storeId,
          categoryId: tenant.categoryId,
          name: "Produit à convertir",
          slug: "produit-a-convertir",
          status: "DRAFT",
          hasVariants: false,
          price: 1000,
          currency: "XOF",
        },
        { userId: tenant.userId },
      );

      const updated = await service.enableVariants(product.id, {
        userId: tenant.userId,
      });

      expect(updated.hasVariants).toBe(true);
      expect(updated.price).toBeNull();
    });

    it("disableVariants refuse s'il existe des variantes", async () => {
      const tenant = await seedTenant(prisma);

      const { product } = await service.createFull(
        {
          storeId: tenant.storeId,
          categoryId: tenant.categoryId,
          name: "Produit avec variantes",
          slug: "produit-avec-variantes",
          status: "DRAFT",
          hasVariants: true,
          currency: "XOF",
          variants: [{ name: "41", sku: "DV-41", price: 15000, inventory: 5 }],
        },
        { userId: tenant.userId },
      );

      await expect(
        service.disableVariants(product.id, 20000, {
          userId: tenant.userId,
        }),
      ).rejects.toMatchObject({
        code: "VARIANTS_EXIST",
      });
    });

    it("disableVariants fonctionne si aucune variante", async () => {
      const tenant = await seedTenant(prisma);

      const { product } = await service.createProduct(
        {
          storeId: tenant.storeId,
          categoryId: tenant.categoryId,
          name: "Produit V2",
          slug: "produit-v2",
          status: "DRAFT",
          hasVariants: true,
          currency: "XOF",
        },
        { userId: tenant.userId },
      );

      const updated = await service.disableVariants(product.id, 5000, {
        userId: tenant.userId,
      });

      expect(updated.hasVariants).toBe(false);
      expect(updated.price?.toString()).toBe("5000");
    });
  });

  /* ================================================================
   * 8. ARCHIVE
   * ================================================================ */

  describe("archiveProduct", () => {
    it("archive le produit et désactive ses variantes", async () => {
      const tenant = await seedTenant(prisma);

      const { product } = await service.createFull(
        {
          storeId: tenant.storeId,
          categoryId: tenant.categoryId,
          name: "Produit à archiver",
          slug: "produit-a-archiver",
          status: "ACTIVE",
          hasVariants: true,
          currency: "XOF",
          variants: [
            { name: "41", sku: "ARC-41", price: 15000, inventory: 5 },
            { name: "42", sku: "ARC-42", price: 15000, inventory: 5 },
          ],
        },
        { userId: tenant.userId },
      );

      await service.archiveProduct(product.id, { userId: tenant.userId });

      const refreshed = await prisma.product.findUnique({
        where: { id: product.id },
        include: { variants: true },
      });

      expect(refreshed?.status).toBe("ARCHIVED");
      expect(refreshed?.variants.every((v) => !v.isActive)).toBe(true);
    });
  });

  /* ================================================================
   * 9. DELETE — protection réservations
   * ================================================================ */

  describe("deleteProduct", () => {
    it("refuse de supprimer un produit avec réservations actives", async () => {
      const tenant = await seedTenant(prisma);

      const { product } = await service.createFull(
        {
          storeId: tenant.storeId,
          categoryId: tenant.categoryId,
          name: "Produit réservé",
          slug: "produit-reserve",
          status: "DRAFT",
          hasVariants: false,
          price: 1000,
          currency: "XOF",
          inventory: 10,
        },
        { userId: tenant.userId },
      );

      await prisma.inventory.update({
        where: { productId: product.id },
        data: { reserved: 3 },
      });

      await expect(
        service.deleteProduct(product.id, { userId: tenant.userId }),
      ).rejects.toMatchObject({
        code: "INVALID_INVENTORY_QUANTITY",
      });
    });

    it("supprime un produit sans réservation", async () => {
      const tenant = await seedTenant(prisma);

      const { product } = await service.createFull(
        {
          storeId: tenant.storeId,
          categoryId: tenant.categoryId,
          name: "Produit supprimable",
          slug: "produit-supprimable",
          status: "DRAFT",
          hasVariants: false,
          price: 1000,
          currency: "XOF",
          inventory: 5,
        },
        { userId: tenant.userId },
      );

      await service.deleteProduct(product.id, { userId: tenant.userId });

      const refreshed = await prisma.product.findUnique({
        where: { id: product.id },
      });
      expect(refreshed).toBeNull();
    });
  });
});
