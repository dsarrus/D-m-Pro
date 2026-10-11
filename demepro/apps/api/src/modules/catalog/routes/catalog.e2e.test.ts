// apps/api/src/modules/catalog/routes/catalog.e2e.test.ts

import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import type { Express } from "express";

import { PrismaClient } from "../../../generated/prisma/client";
import { startPostgres, stopPostgres } from "../../../../tests/setup/postgres";
import { seedTenant, truncateAll } from "../../../../tests/helpers/factories";
import { asUser } from "../../../../tests/helpers/auth";
import request from "supertest";
/* ================================================================
 * SUITE
 * ================================================================ */
/**
 * ⚠️ createTestApp est importé DYNAMIQUEMENT dans beforeAll,
 * car il importe `prisma` (via les routes) et on veut
 * que DATABASE_URL soit défini avant.
 */
describe("Catalog HTTP (E2E)", () => {
  let prisma: PrismaClient;
  let app: Express;

  beforeAll(async () => {
    /* 1. Démarrer Testcontainers */
    const ctx = await startPostgres();
    prisma = ctx.prisma;

    /* 2. Définir DATABASE_URL */
    process.env.DATABASE_URL = ctx.databaseUrl;

    /* 3. Import dynamique APRÈS avoir défini l'env */
    const { createTestApp } = await import(
      "../../../../tests/setup/test-app"
    );
    app = createTestApp();
  });

  afterAll(async () => {
    await stopPostgres();
  });

  beforeEach(async () => {
    await truncateAll(prisma);
  });

  /* ================================================================
   * HELPERS LOCAUX
   * ================================================================ */

  const BASE = "/api/v1/catalog";

  /**
   * Crée un produit simple via HTTP et retourne le body.
   */
  async function createSimpleProduct(
    tenant: Awaited<ReturnType<typeof seedTenant>>,
    overrides?: Partial<{
      name: string;
      slug: string;
      price: number;
    }>,
  ) {
    const api = asUser(app, tenant.userId);
    const res = await api.post(`${BASE}/products`).send({
      storeId: tenant.storeId,
      categoryId: tenant.categoryId,
      name: overrides?.name ?? "Produit test",
      slug: overrides?.slug ?? `produit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      status: "DRAFT",
      hasVariants: false,
      price: overrides?.price ?? 1000,
      currency: "XOF",
    });
    if (res.status !== 201) {
      throw new Error(
        `createSimpleProduct failed: ${res.status} ${JSON.stringify(res.body)}`,
      );
    }
    return res.body.data.product;
  }

  /**
   * Crée un produit complet (avec variants + images + inventory) via HTTP.
   */
  async function createFullProduct(
  tenant: Awaited<ReturnType<typeof seedTenant>>,
  overrides?: Partial<{
    name: string;
    slug: string;
    hasVariants: boolean;
    variants: any[];
    images: any[];
    inventory: number;
  }>,
) {
  const api = asUser(app, tenant.userId);
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const hasVariants = overrides?.hasVariants ?? false;

  /* Construction conditionnelle du body */
  const body: Record<string, unknown> = {
    storeId: tenant.storeId,
    categoryId: tenant.categoryId,
    name: overrides?.name ?? "Produit full",
    slug: overrides?.slug ?? `produit-full-${suffix}`,
    status: "DRAFT",
    hasVariants,
    currency: "XOF",
    images: overrides?.images,
  };

  if (hasVariants) {
    /* Produit à variantes : variants[], pas de price, pas d'inventory */
    body.variants = overrides?.variants;
  } else {
    /* Produit simple : price + inventory */
    body.price = 1000;
    body.inventory = overrides?.inventory ?? 10;
  }

  const res = await api.post(`${BASE}/products/full`).send(body);

  if (res.status !== 201) {
    throw new Error(
      `createFullProduct failed: ${res.status} ${JSON.stringify(res.body)}`,
    );
  }

  return res.body.data.product;
}

  /* ================================================================
   * 1. POST /products — Création simple
   * ================================================================ */

  describe("POST /products", () => {
    it("crée un produit simple et retourne 201", async () => {
      const tenant = await seedTenant(prisma);
      const api = asUser(app, tenant.userId);

      const res = await api.post(`${BASE}/products`).send({
        storeId: tenant.storeId,
        categoryId: tenant.categoryId,
        name: "Canapé 3 places",
        slug: "canape-3-places",
        status: "DRAFT",
        hasVariants: false,
        price: 350000,
        currency: "XOF",
      });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.product.id).toBeDefined();
      expect(res.body.data.product.slug).toBe("canape-3-places");
      expect(res.body.data.product.hasVariants).toBe(false);
      expect(res.body.data.product.price).toBe("350000");
    });

    it("retourne 400 si validation Zod échoue (storeId invalide)", async () => {
      const tenant = await seedTenant(prisma);
      const api = asUser(app, tenant.userId);

      const res = await api.post(`${BASE}/products`).send({
        storeId: "not-a-uuid",
        categoryId: tenant.categoryId,
        name: "X",
        slug: "x",
        status: "DRAFT",
        hasVariants: false,
        price: 1000,
        currency: "XOF",
      });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it("retourne 400 si hasVariants=true sans variants", async () => {
      const tenant = await seedTenant(prisma);
      const api = asUser(app, tenant.userId);

      const res = await api.post(`${BASE}/products`).send({
        storeId: tenant.storeId,
        categoryId: tenant.categoryId,
        name: "Produit",
        slug: "produit-x",
        status: "DRAFT",
        hasVariants: true,
        currency: "XOF",
      });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it("retourne 403 si l'utilisateur n'est pas propriétaire du store", async () => {
      const owner = await seedTenant(prisma);
      const other = await seedTenant(prisma);

      const api = asUser(app, other.userId);
      const res = await api.post(`${BASE}/products`).send({
        storeId: owner.storeId,
        categoryId: owner.categoryId,
        name: "Canapé",
        slug: "canape",
        status: "DRAFT",
        hasVariants: false,
        price: 1000,
        currency: "XOF",
      });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe("UNAUTHORIZED_STORE");
    });

    it("retourne 404 si la catégorie n'existe pas", async () => {
      const tenant = await seedTenant(prisma);
      const api = asUser(app, tenant.userId);

      const res = await api.post(`${BASE}/products`).send({
        storeId: tenant.storeId,
        categoryId: "00000000-0000-0000-0000-000000000000",
        name: "Produit",
        slug: "produit",
        status: "DRAFT",
        hasVariants: false,
        price: 1000,
        currency: "XOF",
      });

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe("CATEGORY_NOT_FOUND");
    });

    it("retourne 409 si le slug est dupliqué dans le store", async () => {
      const tenant = await seedTenant(prisma);
      await createSimpleProduct(tenant, { slug: "slug-unique" });

      const api = asUser(app, tenant.userId);
      const res = await api.post(`${BASE}/products`).send({
        storeId: tenant.storeId,
        categoryId: tenant.categoryId,
        name: "Autre",
        slug: "slug-unique",
        status: "DRAFT",
        hasVariants: false,
        price: 1000,
        currency: "XOF",
      });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe("DUPLICATE_SLUG");
    });

    it("respecte l'Idempotency-Key sur deux appels identiques", async () => {
      const tenant = await seedTenant(prisma);

      const payload = {
        storeId: tenant.storeId,
        categoryId: tenant.categoryId,
        name: "Produit idem",
        slug: "produit-idem",
        status: "DRAFT",
        hasVariants: false,
        price: 1000,
        currency: "XOF",
      };

      const api = asUser(app, tenant.userId);

      const res1 = await api
        .post(`${BASE}/products`)
        .set("Idempotency-Key", "test-key-1")
        .send(payload);

      const res2 = await api
        .post(`${BASE}/products`)
        .set("Idempotency-Key", "test-key-1")
        .send(payload);

      expect(res1.status).toBe(201);
      expect(res2.status).toBe(201);
      expect(res2.body.data.product.id).toBe(res1.body.data.product.id);

      const count = await prisma.product.count({
        where: { storeId: tenant.storeId },
      });
      expect(count).toBe(1);
    });
  });

  /* ================================================================
   * 2. POST /products/full — Création atomique
   * ================================================================ */

  describe("POST /products/full", () => {
    it("crée un produit simple + inventory + images", async () => {
      const tenant = await seedTenant(prisma);
      const api = asUser(app, tenant.userId);

      const res = await api.post(`${BASE}/products/full`).send({
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
          { objectKey: "products/chaise-1.jpg", isPrimary: true, sortOrder: 0 },
          { objectKey: "products/chaise-2.jpg", isPrimary: false, sortOrder: 1 },
        ],
      });

      expect(res.status).toBe(201);
      expect(res.body.data.product.images).toHaveLength(2);
      expect(res.body.data.product.inventory.quantity).toBe(10);
      expect(res.body.data.product.variants).toHaveLength(0);

      const primary = res.body.data.product.images.filter(
        (i: any) => i.isPrimary,
      );
      expect(primary).toHaveLength(1);
    });

    it("crée un produit à variantes + inventories par variante", async () => {
      const tenant = await seedTenant(prisma);
      const api = asUser(app, tenant.userId);

      const res = await api.post(`${BASE}/products/full`).send({
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
      });

      expect(res.status).toBe(201);
      expect(res.body.data.product.variants).toHaveLength(2);
      expect(res.body.data.product.inventory).toBeNull();

      const skus = res.body.data.product.variants
        .map((v: any) => v.sku)
        .sort();
      expect(skus).toEqual(["CH-41", "CH-42"]);

      const quantities = res.body.data.product.variants.map(
        (v: any) => v.inventory.quantity,
      );
      expect(quantities).toEqual([10, 8]);
    });

    it("retourne 400 si hasVariants=true sans variants", async () => {
      const tenant = await seedTenant(prisma);
      const api = asUser(app, tenant.userId);

      const res = await api.post(`${BASE}/products/full`).send({
        storeId: tenant.storeId,
        categoryId: tenant.categoryId,
        name: "Produit",
        slug: "produit-full-vide",
        status: "DRAFT",
        hasVariants: true,
        currency: "XOF",
      });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it("retourne 400 si hasVariants=false avec un price null", async () => {
      const tenant = await seedTenant(prisma);
      const api = asUser(app, tenant.userId);

      const res = await api.post(`${BASE}/products/full`).send({
        storeId: tenant.storeId,
        categoryId: tenant.categoryId,
        name: "Produit",
        slug: "produit-sans-price",
        status: "DRAFT",
        hasVariants: false,
        currency: "XOF",
      });

      expect(res.status).toBe(400);
    });

    it("retourne 409 si SKU dupliqué dans une variante", async () => {
      const tenant = await seedTenant(prisma);
      await createFullProduct(tenant, {
        hasVariants: true,
        slug: `chaussure-${Date.now()}`,
        variants: [
          { name: "41", sku: "SKU-DUP", price: 15000, inventory: 5 },
        ],
      });

      const api = asUser(app, tenant.userId);
      const res = await api.post(`${BASE}/products/full`).send({
        storeId: tenant.storeId,
        categoryId: tenant.categoryId,
        name: "Autre",
        slug: `autre-${Date.now()}`,
        status: "DRAFT",
        hasVariants: true,
        currency: "XOF",
        variants: [
          { name: "42", sku: "SKU-DUP", price: 15000, inventory: 5 },
        ],
      });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe("DUPLICATE_SKU");
    });
  });

  /* ================================================================
   * 3. GET /products/:id
   * ================================================================ */

  describe("GET /products/:id", () => {
    it("retourne le produit avec ses relations", async () => {
      const tenant = await seedTenant(prisma);
      const product = await createSimpleProduct(tenant);

      const api = asUser(app, tenant.userId);
      const res = await api.get(`${BASE}/products/${product.id}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(product.id);
      expect(res.body.data.images).toBeDefined();
      expect(res.body.data.variants).toBeDefined();
    });

    it("retourne 404 si introuvable", async () => {
      const tenant = await seedTenant(prisma);
      const api = asUser(app, tenant.userId);

      const res = await api.get(
        `${BASE}/products/00000000-0000-0000-0000-000000000000`,
      );

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe("PRODUCT_NOT_FOUND");
    });

    it("retourne 400 si l'id n'est pas un UUID", async () => {
      const tenant = await seedTenant(prisma);
      const api = asUser(app, tenant.userId);

      const res = await api.get(`${BASE}/products/not-a-uuid`);

      expect(res.status).toBe(400);
    });
  });

  /* ================================================================
   * 4. PATCH /products/:id
   * ================================================================ */

  describe("PATCH /products/:id", () => {
    it("met à jour le nom", async () => {
      const tenant = await seedTenant(prisma);
      const product = await createSimpleProduct(tenant);

      const api = asUser(app, tenant.userId);
      const res = await api
        .patch(`${BASE}/products/${product.id}`)
        .send({ name: "Nom modifié" });

      expect(res.status).toBe(200);
      expect(res.body.data.name).toBe("Nom modifié");
    });

    it("retourne 403 si non propriétaire", async () => {
      const owner = await seedTenant(prisma);
      const other = await seedTenant(prisma);
      const product = await createSimpleProduct(owner);

      const api = asUser(app, other.userId);
      const res = await api
        .patch(`${BASE}/products/${product.id}`)
        .send({ name: "Hack" });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe("UNAUTHORIZED_STORE");
    });

    it("retourne 422 si on retire le prix d'un produit simple", async () => {
      const tenant = await seedTenant(prisma);
      const product = await createSimpleProduct(tenant);

      const api = asUser(app, tenant.userId);
      const res = await api
        .patch(`${BASE}/products/${product.id}`)
        .send({ price: null });

      expect(res.status).toBe(422);
      expect(res.body.error.code).toBe("INVALID_PRODUCT_STATE");
    });
  });

  /* ================================================================
   * 5. ACTIONS produit (activate, archive, variants toggle)
   * ================================================================ */

  describe("Actions produit", () => {
    it("POST /products/:id/activate → 422 si pas de stock", async () => {
      const tenant = await seedTenant(prisma);
      const product = await createFullProduct(tenant, { inventory: 0 });

      const api = asUser(app, tenant.userId);
      const res = await api.post(`${BASE}/products/${product.id}/activate`);

      expect(res.status).toBe(422);
      expect(res.body.error.code).toBe("INVALID_PRODUCT_STATE");
    });

    it("POST /products/:id/activate → 200 avec stock", async () => {
      const tenant = await seedTenant(prisma);
      const product = await createFullProduct(tenant, { inventory: 5 });

      const api = asUser(app, tenant.userId);
      const res = await api.post(`${BASE}/products/${product.id}/activate`);

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe("ACTIVE");
    });

    it("DELETE /products/:id → archive", async () => {
      const tenant = await seedTenant(prisma);
      const product = await createSimpleProduct(tenant);

      const api = asUser(app, tenant.userId);
      const res = await api.delete(`${BASE}/products/${product.id}`);

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe("ARCHIVED");
    });

    it("POST /products/:id/enable-variants", async () => {
      const tenant = await seedTenant(prisma);
      const product = await createSimpleProduct(tenant);

      const api = asUser(app, tenant.userId);
      const res = await api.post(
        `${BASE}/products/${product.id}/enable-variants`,
      );

      expect(res.status).toBe(200);
      expect(res.body.data.hasVariants).toBe(true);
      expect(res.body.data.price).toBeNull();
    });

    it("POST /products/:id/disable-variants → 422 si variantes existent", async () => {
      const tenant = await seedTenant(prisma);
      const product = await createFullProduct(tenant, {
        hasVariants: true,
        variants: [
          { name: "41", sku: `V-${Date.now()}`, price: 15000, inventory: 5 },
        ],
      });

      const api = asUser(app, tenant.userId);
      const res = await api
        .post(`${BASE}/products/${product.id}/disable-variants`)
        .send({ price: 20000 });

      expect(res.status).toBe(422);
      expect(res.body.error.code).toBe("VARIANTS_EXIST");
    });
  });

  /* ================================================================
   * 6. VARIANTS HTTP
   * ================================================================ */

  describe("Variants HTTP", () => {
    async function setupProductWithVariant(
      tenant: Awaited<ReturnType<typeof seedTenant>>,
    ) {
      return createFullProduct(tenant, {
        hasVariants: true,
        variants: [
          {
            name: "41",
            sku: `V-41-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            price: 15000,
            inventory: 5,
          },
        ],
      });
    }

    it("POST /products/:productId/variants → crée une variante", async () => {
      const tenant = await seedTenant(prisma);
      const product = await setupProductWithVariant(tenant);

      const api = asUser(app, tenant.userId);
      const res = await api
        .post(`${BASE}/products/${product.id}/variants`)
        .send({
          name: "42",
          sku: `V-42-${Date.now()}`,
          price: 15000,
          inventory: 8,
        });

      expect(res.status).toBe(201);
      expect(res.body.data.variant.name).toBe("42");
      expect(res.body.data.inventory.quantity).toBe(8);
    });

    it("GET /products/:productId/variants → liste", async () => {
      const tenant = await seedTenant(prisma);
      const product = await setupProductWithVariant(tenant);

      const api = asUser(app, tenant.userId);
      const res = await api.get(`${BASE}/products/${product.id}/variants`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].name).toBe("41");
    });

    it("GET /variants/:id → retourne la variante", async () => {
      const tenant = await seedTenant(prisma);
      const product = await setupProductWithVariant(tenant);
      const variantId = product.variants[0].id;

      const api = asUser(app, tenant.userId);
      const res = await api.get(`${BASE}/variants/${variantId}`);

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(variantId);
    });

    it("PATCH /variants/:id → met à jour", async () => {
      const tenant = await seedTenant(prisma);
      const product = await setupProductWithVariant(tenant);
      const variantId = product.variants[0].id;

      const api = asUser(app, tenant.userId);
      const res = await api
        .patch(`${BASE}/variants/${variantId}`)
        .send({ name: "Renommée" });

      expect(res.status).toBe(200);
      expect(res.body.data.name).toBe("Renommée");
    });

    it("POST /variants/:id/deactivate → 422 si dernière active", async () => {
      const tenant = await seedTenant(prisma);
      const product = await setupProductWithVariant(tenant);
      const variantId = product.variants[0].id;

      const api = asUser(app, tenant.userId);
      const res = await api.post(
        `${BASE}/variants/${variantId}/deactivate`,
      );

      expect(res.status).toBe(422);
      expect(res.body.error.code).toBe("LAST_ACTIVE_VARIANT");
    });

    it("POST /variants/:id/deactivate → 200 avec autre active", async () => {
      const tenant = await seedTenant(prisma);
      const product = await setupProductWithVariant(tenant);

      const api = asUser(app, tenant.userId);
      await api
        .post(`${BASE}/products/${product.id}/variants`)
        .send({
          name: "42",
          sku: `V-42B-${Date.now()}`,
          price: 15000,
          inventory: 5,
        });

      const variantId = product.variants[0].id;
      const res = await api.post(
        `${BASE}/variants/${variantId}/deactivate`,
      );

      expect(res.status).toBe(200);
      expect(res.body.data.isActive).toBe(false);
    });

    it("DELETE /variants/:id → supprime", async () => {
      const tenant = await seedTenant(prisma);
      const product = await setupProductWithVariant(tenant);
      const variantId = product.variants[0].id;

      const api = asUser(app, tenant.userId);
      const res = await api.delete(`${BASE}/variants/${variantId}`);

      expect(res.status).toBe(200);
      expect(res.body.data.variant.id).toBe(variantId);
    });
  });

  /* ================================================================
   * 7. IMAGES HTTP
   * ================================================================ */

  describe("Images HTTP", () => {
    it("POST /products/:productId/images → première image primaire auto", async () => {
      const tenant = await seedTenant(prisma);
      const product = await createSimpleProduct(tenant);

      const api = asUser(app, tenant.userId);
      const res = await api
        .post(`${BASE}/products/${product.id}/images`)
        .send({ objectKey: "products/p1.jpg", isPrimary: false });

      expect(res.status).toBe(201);
      expect(res.body.data.isPrimary).toBe(true);
    });

    it("POST /products/:productId/images → 2ᵉ primaire démarque la 1ère", async () => {
      const tenant = await seedTenant(prisma);
      const product = await createSimpleProduct(tenant);

      const api = asUser(app, tenant.userId);

      const first = await api
        .post(`${BASE}/products/${product.id}/images`)
        .send({ objectKey: "p1.jpg", isPrimary: true });

      const second = await api
        .post(`${BASE}/products/${product.id}/images`)
        .send({ objectKey: "p2.jpg", isPrimary: true });

      expect(second.body.data.isPrimary).toBe(true);

      const refreshedFirst = await prisma.productImage.findUnique({
        where: { id: first.body.data.id },
      });
      expect(refreshedFirst!.isPrimary).toBe(false);

      const primaries = await prisma.productImage.count({
        where: { productId: product.id, isPrimary: true },
      });
      expect(primaries).toBe(1);
    });

    it("GET /products/:productId/images → liste triée", async () => {
      const tenant = await seedTenant(prisma);
      const product = await createSimpleProduct(tenant);

      const api = asUser(app, tenant.userId);
      await api
        .post(`${BASE}/products/${product.id}/images`)
        .send({ objectKey: "p1.jpg" });
      await api
        .post(`${BASE}/products/${product.id}/images`)
        .send({ objectKey: "p2.jpg" });

      const res = await api.get(`${BASE}/products/${product.id}/images`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(2);
      expect(res.body.data[0].isPrimary).toBe(true);
    });

    it("PATCH /images/:id → promotion primaire", async () => {
      const tenant = await seedTenant(prisma);
      const product = await createSimpleProduct(tenant);

      const api = asUser(app, tenant.userId);
      const first = await api
        .post(`${BASE}/products/${product.id}/images`)
        .send({ objectKey: "p1.jpg", isPrimary: true });

      const second = await api
        .post(`${BASE}/products/${product.id}/images`)
        .send({ objectKey: "p2.jpg", isPrimary: false });

      const res = await api
        .patch(`${BASE}/images/${second.body.data.id}`)
        .send({ isPrimary: true });

      expect(res.status).toBe(200);
      expect(res.body.data.isPrimary).toBe(true);
    });

    it("DELETE /images/:id → promotion automatique", async () => {
      const tenant = await seedTenant(prisma);
      const product = await createSimpleProduct(tenant);

      const api = asUser(app, tenant.userId);
      const first = await api
        .post(`${BASE}/products/${product.id}/images`)
        .send({ objectKey: "p1.jpg", isPrimary: true });

      const second = await api
        .post(`${BASE}/products/${product.id}/images`)
        .send({ objectKey: "p2.jpg", isPrimary: false });

      const res = await api.delete(`${BASE}/images/${first.body.data.id}`);

      expect(res.status).toBe(200);
      expect(res.body.data.promotedPrimary.id).toBe(second.body.data.id);

      const refreshed = await prisma.productImage.findUnique({
        where: { id: second.body.data.id },
      });
      expect(refreshed!.isPrimary).toBe(true);
    });

    it("POST /products/:productId/images/reorder → réordonne", async () => {
      const tenant = await seedTenant(prisma);
      const product = await createSimpleProduct(tenant);

      const api = asUser(app, tenant.userId);
      const a = await api
        .post(`${BASE}/products/${product.id}/images`)
        .send({ objectKey: "a.jpg", sortOrder: 0 });
      const b = await api
        .post(`${BASE}/products/${product.id}/images`)
        .send({ objectKey: "b.jpg", sortOrder: 1 });

      const res = await api
        .post(`${BASE}/products/${product.id}/images/reorder`)
        .send({ imageIds: [b.body.data.id, a.body.data.id] });

      expect(res.status).toBe(200);

      const refreshedB = await prisma.productImage.findUnique({
        where: { id: b.body.data.id },
      });
      const refreshedA = await prisma.productImage.findUnique({
        where: { id: a.body.data.id },
      });
      expect(refreshedB!.sortOrder).toBe(0);
      expect(refreshedA!.sortOrder).toBe(1);
    });
  });

  /* ================================================================
   * 8. INVENTORY HTTP
   * ================================================================ */

  describe("Inventory HTTP", () => {
    it("GET /inventory/:id → retourne l'inventaire du propriétaire", async () => {
      const tenant = await seedTenant(prisma);
      const product = await createFullProduct(tenant, { inventory: 10 });

      const inventory = await prisma.inventory.findUnique({
        where: { productId: product.id },
      });

      const api = asUser(app, tenant.userId);
      const res = await api.get(`${BASE}/inventory/${inventory!.id}`);

      expect(res.status).toBe(200);
      expect(res.body.data.quantity).toBe(10);
    });

    it("PATCH /inventory/:id → setQuantity", async () => {
      const tenant = await seedTenant(prisma);
      const product = await createFullProduct(tenant, { inventory: 10 });

      const inventory = await prisma.inventory.findUnique({
        where: { productId: product.id },
      });

      const api = asUser(app, tenant.userId);
      const res = await api
        .patch(`${BASE}/inventory/${inventory!.id}`)
        .send({ quantity: 25 });

      expect(res.status).toBe(200);
      expect(res.body.data.quantity).toBe(25);
    });

    it("PATCH /inventory/:id → 422 si quantity < reserved", async () => {
      const tenant = await seedTenant(prisma);
      const product = await createFullProduct(tenant, { inventory: 10 });

      const inventory = await prisma.inventory.findUnique({
        where: { productId: product.id },
      });

      await prisma.inventory.update({
        where: { id: inventory!.id },
        data: { reserved: 5 },
      });

      const api = asUser(app, tenant.userId);
      const res = await api
        .patch(`${BASE}/inventory/${inventory!.id}`)
        .send({ quantity: 3 });

      expect(res.status).toBe(422);
      expect(res.body.error.code).toBe("INVALID_INVENTORY_QUANTITY");
    });

    it("POST /inventory/:id/adjust → delta positif", async () => {
      const tenant = await seedTenant(prisma);
      const product = await createFullProduct(tenant, { inventory: 10 });

      const inventory = await prisma.inventory.findUnique({
        where: { productId: product.id },
      });

      const api = asUser(app, tenant.userId);
      const res = await api
        .post(`${BASE}/inventory/${inventory!.id}/adjust`)
        .send({ delta: 5 });

      expect(res.status).toBe(200);
      expect(res.body.data.quantity).toBe(15);
    });

    it("POST /inventory/:id/adjust → 400 si delta = 0", async () => {
      const tenant = await seedTenant(prisma);
      const product = await createFullProduct(tenant, { inventory: 10 });

      const inventory = await prisma.inventory.findUnique({
        where: { productId: product.id },
      });

      const api = asUser(app, tenant.userId);
      const res = await api
        .post(`${BASE}/inventory/${inventory!.id}/adjust`)
        .send({ delta: 0 });

      expect(res.status).toBe(400);
    });

    it("POST /inventory/product/:productId → crée l'inventaire", async () => {
      const tenant = await seedTenant(prisma);
      const product = await createSimpleProduct(tenant);

      const api = asUser(app, tenant.userId);
      const res = await api
        .post(`${BASE}/inventory/product/${product.id}`)
        .send({ quantity: 42 });

      expect(res.status).toBe(201);
      expect(res.body.data.quantity).toBe(42);
    });
  });

  /* ================================================================
   * 9. AUTH — Erreurs 401 / 403
   * ================================================================ */

  describe("Authentification et autorisation", () => {
    it("retourne 401 si aucun header d'auth", async () => {
      const res = await request(app)
        .post(`${BASE}/products`)
        .send({
          storeId: "00000000-0000-0000-0000-000000000000",
          categoryId: "00000000-0000-0000-0000-000000000000",
          name: "X",
          slug: "x",
          status: "DRAFT",
          hasVariants: false,
          price: 1000,
          currency: "XOF",
        });

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe("UNAUTHENTICATED");
    });

    it("retourne 403 si permissions insuffisantes", async () => {
      const tenant = await seedTenant(prisma);

      /* Utilisateur sans permission de création */
      const api = asUser(app, tenant.userId, {
        role: "CLIENT",
        permissions: ["catalog.product.read"], // pas de .create
      });

      const res = await api.post(`${BASE}/products`).send({
        storeId: tenant.storeId,
        categoryId: tenant.categoryId,
        name: "X",
        slug: "x",
        status: "DRAFT",
        hasVariants: false,
        price: 1000,
        currency: "XOF",
      });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe("UNAUTHORIZED");
    });
  });

  /* ================================================================
   * 10. SCÉNARIO COMPLET — bout en bout
   * ================================================================ */

  describe("Scénario complet", () => {
    it("parcours : créer → activer → ajouter variante → archiver", async () => {
      const tenant = await seedTenant(prisma);
      const api = asUser(app, tenant.userId);

      /* 1. Créer un produit à variantes */
      const created = await api.post(`${BASE}/products/full`).send({
        storeId: tenant.storeId,
        categoryId: tenant.categoryId,
        name: "T-shirt",
        slug: `tshirt-${Date.now()}`,
        status: "DRAFT",
        hasVariants: true,
        currency: "XOF",
        variants: [
          { name: "S", sku: `TS-S-${Date.now()}`, price: 5000, inventory: 10 },
        ],
      });

      expect(created.status).toBe(201);
      const productId = created.body.data.product.id;

      /* 2. Activer */
      const activated = await api.post(
        `${BASE}/products/${productId}/activate`,
      );
      expect(activated.status).toBe(200);
      expect(activated.body.data.status).toBe("ACTIVE");

      /* 3. Ajouter une variante */
      const newVariant = await api
        .post(`${BASE}/products/${productId}/variants`)
        .send({
          name: "M",
          sku: `TS-M-${Date.now()}`,
          price: 5000,
          inventory: 5,
        });
      expect(newVariant.status).toBe(201);

      /* 4. Vérifier l'état */
      const fetched = await api.get(`${BASE}/products/${productId}`);
      expect(fetched.body.data.variants).toHaveLength(2);

      /* 5. Archiver */
      const archived = await api.delete(`${BASE}/products/${productId}`);
      expect(archived.status).toBe(200);
      expect(archived.body.data.status).toBe("ARCHIVED");

      /* 6. Vérifier que toutes les variantes sont désactivées */
      const variantsAfter = await prisma.productVariant.findMany({
        where: { productId },
      });
      expect(variantsAfter.every((v) => !v.isActive)).toBe(true);
    });
  });
});