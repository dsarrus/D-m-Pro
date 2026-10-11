// apps/api/src/modules/order/tests/order.e2e.test.ts

import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import type { Express } from "express";

import { PrismaClient } from "../../../generated/prisma/client";
import { startPostgres, stopPostgres } from "../../../../tests/setup/postgres";
import { seedTenant, truncateAll } from "../../../../tests/helpers/factories";
import { createTestApp } from "../../../../tests/setup/test-app";
import { asUser } from "../../../../tests/helpers/auth";

import { ProductService } from "../../catalog/services/product.service";
import { ProductRepository } from "../../catalog/repositories/product.repository";
import { IdempotencyService } from "../../catalog/services/idempotency.service";

describe("Order HTTP (E2E)", () => {
  let prisma: PrismaClient;
  let app: Express;
  let productService: ProductService;

  beforeAll(async () => {
    const ctx = await startPostgres();
    prisma = ctx.prisma;
    app = createTestApp();

    const productRepo = new ProductRepository(prisma);
    const idempotency = new IdempotencyService(prisma);
    productService = new ProductService(prisma, productRepo, idempotency);
  });

  afterAll(async () => {
    await stopPostgres();
  });

  beforeEach(async () => {
    await truncateAll(prisma);
  });

  const BASE = "/api/v1/orders";

  /* ================================================================
   * HELPERS
   * ================================================================ */

  async function setupStoreWithProduct(stock = 10) {
    const pro = await seedTenant(prisma);
    const client = await seedTenant(prisma);

    const { product } = await productService.createFull(
      {
        storeId: pro.storeId,
        categoryId: pro.categoryId,
        name: "Produit test",
        slug: `produit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        status: "ACTIVE",
        hasVariants: false,
        price: 5000,
        currency: "XOF",
        inventory: stock,
      },
      { userId: pro.userId },
    );

    return { pro, client, product, storeId: pro.storeId };
  }

  function buildOrderPayload(
    storeId: string,
    productId: string,
    quantity = 1,
  ) {
    return {
      storeId,
      deliveryAddress: "Bamako, Hamdallaye",
      deliveryFee: 1000,
      currency: "XOF" as const,
      items: [{ productId, quantity }],
    };
  }

  /* ================================================================
   * CREATE
   * ================================================================ */

  describe("POST /orders", () => {
    it("crée une commande et retourne 201", async () => {
      const { client, product, storeId } = await setupStoreWithProduct(10);
      const api = asUser(app, client.userId, { role: "CLIENT" });

      const res = await api
        .post(BASE)
        .send(buildOrderPayload(storeId, product.id, 3));

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe("PENDING");
      expect(res.body.data.items).toHaveLength(1);
      expect(res.body.data.totalAmount).toBe("16000");
    });

    it("retourne 400 si validation Zod échoue (storeId invalide)", async () => {
      const { client, product } = await setupStoreWithProduct();
      const api = asUser(app, client.userId, { role: "CLIENT" });

      const res = await api.post(BASE).send({
        storeId: "not-a-uuid",
        deliveryAddress: "X",
        items: [{ productId: product.id, quantity: 1 }],
      });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
    });

    it("retourne 400 si la commande est vide", async () => {
      const { client, storeId } = await setupStoreWithProduct();
      const api = asUser(app, client.userId, { role: "CLIENT" });

      const res = await api.post(BASE).send({
        storeId,
        deliveryAddress: "Bamako",
        items: [],
      });

      expect(res.status).toBe(400);
    });

    it("retourne 401 sans authentification", async () => {
      const { product, storeId } = await setupStoreWithProduct();

      const res = await require("supertest")(app)
        .post(BASE)
        .send(buildOrderPayload(storeId, product.id));

      expect(res.status).toBe(401);
    });

    it("retourne 403 si permission manquante", async () => {
      const { client, product, storeId } = await setupStoreWithProduct();
      const api = asUser(app, client.userId, {
        role: "CLIENT",
        permissions: ["catalog.product.read"], // pas order.create
      });

      const res = await api
        .post(BASE)
        .send(buildOrderPayload(storeId, product.id));

      expect(res.status).toBe(403);
    });

    it("retourne 422 si stock insuffisant", async () => {
      const { client, product, storeId } = await setupStoreWithProduct(2);
      const api = asUser(app, client.userId, { role: "CLIENT" });

      const res = await api
        .post(BASE)
        .send(buildOrderPayload(storeId, product.id, 5));

      expect(res.status).toBe(422);
      expect(res.body.error.code).toBe("INSUFFICIENT_STOCK");
    });

    it("retourne 403 si le pro commande dans sa propre boutique", async () => {
      const { pro, product, storeId } = await setupStoreWithProduct();
      const api = asUser(app, pro.userId, { role: "PROFESSIONAL" });

      const res = await api
        .post(BASE)
        .send(buildOrderPayload(storeId, product.id));

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe("UNAUTHORIZED_ORDER");
    });
  });

  /* ================================================================
   * LIST MINE
   * ================================================================ */

  describe("GET /orders/mine", () => {
    it("retourne les commandes du client", async () => {
      const { client, product, storeId } = await setupStoreWithProduct();
      const api = asUser(app, client.userId, { role: "CLIENT" });

      await api.post(BASE).send(buildOrderPayload(storeId, product.id));

      const res = await api.get(`${BASE}/mine`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.pagination).toBeDefined();
    });

    it("filtre par status", async () => {
      const { client, product, storeId } = await setupStoreWithProduct();
      const api = asUser(app, client.userId, { role: "CLIENT" });

      await api.post(BASE).send(buildOrderPayload(storeId, product.id));

      const res = await api.get(`${BASE}/mine?status=PENDING`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
    });

    it("retourne un tableau vide si aucune commande", async () => {
      const client = await seedTenant(prisma);
      const api = asUser(app, client.userId, { role: "CLIENT" });

      const res = await api.get(`${BASE}/mine`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(0);
    });
  });

  /* ================================================================
   * LIST STORE ORDERS
   * ================================================================ */

  describe("GET /orders/store/:storeId", () => {
    it("retourne les commandes reçues par le pro", async () => {
      const { pro, client, product, storeId } = await setupStoreWithProduct();

      const clientApi = asUser(app, client.userId, { role: "CLIENT" });
      await clientApi.post(BASE).send(buildOrderPayload(storeId, product.id));

      const proApi = asUser(app, pro.userId, { role: "PROFESSIONAL" });
      const res = await proApi.get(`${BASE}/store/${storeId}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
    });

    it("retourne 403 si non-propriétaire du store", async () => {
      const { client, storeId } = await setupStoreWithProduct();
      const api = asUser(app, client.userId, { role: "CLIENT" });

      const res = await api.get(`${BASE}/store/${storeId}`);

      expect(res.status).toBe(403);
    });
  });

  /* ================================================================
   * GET BY ID
   * ================================================================ */

  describe("GET /orders/:id", () => {
    it("retourne la commande au client propriétaire", async () => {
      const { client, product, storeId } = await setupStoreWithProduct();
      const api = asUser(app, client.userId, { role: "CLIENT" });

      const create = await api
        .post(BASE)
        .send(buildOrderPayload(storeId, product.id));

      const res = await api.get(`${BASE}/${create.body.data.id}`);

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(create.body.data.id);
    });

    it("retourne la commande au pro de la boutique", async () => {
      const { pro, client, product, storeId } = await setupStoreWithProduct();

      const clientApi = asUser(app, client.userId, { role: "CLIENT" });
      const create = await clientApi
        .post(BASE)
        .send(buildOrderPayload(storeId, product.id));

      const proApi = asUser(app, pro.userId, { role: "PROFESSIONAL" });
      const res = await proApi.get(`${BASE}/${create.body.data.id}`);

      expect(res.status).toBe(200);
    });

    it("retourne 403 pour un client tiers", async () => {
      const { client, product, storeId } = await setupStoreWithProduct();
      const otherClient = await seedTenant(prisma);

      const clientApi = asUser(app, client.userId, { role: "CLIENT" });
      const create = await clientApi
        .post(BASE)
        .send(buildOrderPayload(storeId, product.id));

      const otherApi = asUser(app, otherClient.userId, { role: "CLIENT" });
      const res = await otherApi.get(`${BASE}/${create.body.data.id}`);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe("UNAUTHORIZED_ORDER");
    });

    it("retourne 404 si introuvable", async () => {
      const client = await seedTenant(prisma);
      const api = asUser(app, client.userId, { role: "CLIENT" });

      const res = await api.get(
        `${BASE}/00000000-0000-0000-0000-000000000000`,
      );

      expect(res.status).toBe(404);
    });
  });

  /* ================================================================
   * CANCEL
   * ================================================================ */

  describe("POST /orders/:id/cancel", () => {
    it("annule une commande PENDING et libère le stock", async () => {
      const { client, product, storeId } = await setupStoreWithProduct(10);
      const api = asUser(app, client.userId, { role: "CLIENT" });

      const create = await api
        .post(BASE)
        .send(buildOrderPayload(storeId, product.id, 3));

      const res = await api
        .post(`${BASE}/${create.body.data.id}/cancel`)
        .send({ reason: "Changement d'avis" });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe("CANCELLED");

      /* Vérifier que le stock est libéré */
      const inventory = await prisma.inventory.findUnique({
        where: { productId: product.id },
      });
      expect(inventory!.reserved).toBe(0);
    });

    it("retourne 400 si reason manquant", async () => {
      const { client, product, storeId } = await setupStoreWithProduct();
      const api = asUser(app, client.userId, { role: "CLIENT" });

      const create = await api
        .post(BASE)
        .send(buildOrderPayload(storeId, product.id));

      const res = await api
        .post(`${BASE}/${create.body.data.id}/cancel`)
        .send({});

      expect(res.status).toBe(400);
    });
  });

  /* ================================================================
   * SHIP + DELIVER
   * ================================================================ */

  describe("POST /orders/:id/ship + /deliver", () => {
    it("parcours complet : create → ship → deliver", async () => {
      const { pro, client, product, storeId } = await setupStoreWithProduct();

      const clientApi = asUser(app, client.userId, { role: "CLIENT" });
      const create = await clientApi
        .post(BASE)
        .send(buildOrderPayload(storeId, product.id));

      /* Marquer comme payé (via service direct, car Payment pas encore en HTTP) */
      const { OrderService } = await import("../services/order.service");
      const { OrderRepository } = await import("../repositories/order.repository");
      const { InventoryService } = await import(
        "../../catalog/services/inventory.service"
      );
      const { InventoryRepository } = await import(
        "../../catalog/repositories/inventory.repository"
      );

      const orderService = new OrderService(
        prisma,
        new OrderRepository(prisma),
        new InventoryService(prisma, new InventoryRepository(prisma)),
      );
      await orderService.markAsPaid(create.body.data.id);

      const proApi = asUser(app, pro.userId, { role: "PROFESSIONAL" });

      /* Expédier */
      const ship = await proApi
        .post(`${BASE}/${create.body.data.id}/ship`)
        .send({ trackingNumber: "TRACK-123" });

      expect(ship.status).toBe(200);
      expect(ship.body.data.status).toBe("SHIPPED");

      /* Livrer */
      const deliver = await proApi
        .post(`${BASE}/${create.body.data.id}/deliver`)
        .send({});

      expect(deliver.status).toBe(200);
      expect(deliver.body.data.status).toBe("DELIVERED");
    });

    it("retourne 422 si transition invalide (PENDING → SHIPPED)", async () => {
      const { pro, client, product, storeId } = await setupStoreWithProduct();

      const clientApi = asUser(app, client.userId, { role: "CLIENT" });
      const create = await clientApi
        .post(BASE)
        .send(buildOrderPayload(storeId, product.id));

      const proApi = asUser(app, pro.userId, { role: "PROFESSIONAL" });
      const res = await proApi
        .post(`${BASE}/${create.body.data.id}/ship`)
        .send({});

      expect(res.status).toBe(422);
      expect(res.body.error.code).toBe("INVALID_ORDER_STATE");
    });

    it("retourne 403 si client tente d'expédier", async () => {
      const { client, product, storeId } = await setupStoreWithProduct();
      const api = asUser(app, client.userId, { role: "CLIENT" });

      const create = await api
        .post(BASE)
        .send(buildOrderPayload(storeId, product.id));

      const res = await api
        .post(`${BASE}/${create.body.data.id}/ship`)
        .send({});

      expect(res.status).toBe(403);
    });
  });
});