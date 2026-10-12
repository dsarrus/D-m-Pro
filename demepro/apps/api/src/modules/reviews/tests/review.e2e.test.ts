// apps/api/src/modules/review/tests/review.e2e.test.ts

import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import type { Express } from "express";

import { PrismaClient } from "../../../generated/prisma/client";
import { startPostgres, stopPostgres } from "../../../../tests/setup/postgres";
import { seedTenant, truncateAll } from "../../../../tests/helpers/factories";
import { createTestApp } from "../../../../tests/setup/test-app";
import { asUser } from "../../../../tests/helpers/auth";

import { OrderService } from "../../orders/services/order.service";
import { OrderRepository } from "../../orders/repositories/order.repository";
import { InventoryService } from "../../catalog/services/inventory.service";
import { InventoryRepository } from "../../catalog/repositories/inventory.repository";
import { ProductService } from "../../catalog/services/product.service";
import { ProductRepository } from "../../catalog/repositories/product.repository";
import { IdempotencyService } from "../../catalog/services/idempotency.service";

describe("Review HTTP (E2E)", () => {
  let prisma: PrismaClient;
  let app: Express;
  let productService: ProductService;
  let orderService: OrderService;

  beforeAll(async () => {
    const ctx = await startPostgres();
    prisma = ctx.prisma;
    app = createTestApp();

    const inventoryRepo = new InventoryRepository(prisma);
    const inventoryService = new InventoryService(prisma, inventoryRepo);

    const productRepo = new ProductRepository(prisma);
    const idempotency = new IdempotencyService(prisma);
    productService = new ProductService(prisma, productRepo, idempotency);

    const orderRepo = new OrderRepository(prisma);
    orderService = new OrderService(prisma, orderRepo, inventoryService);
  });

  afterAll(async () => {
    await stopPostgres();
  });

  beforeEach(async () => {
    await truncateAll(prisma);
  });

  const BASE = "/api/v1/reviews";

  /* ================================================================
   * HELPERS
   * ================================================================ */

  async function setupDeliveredOrder() {
    const pro = await seedTenant(prisma);
    const client = await seedTenant(prisma);

    const { product } = await productService.createFull(
      {
        storeId: pro.storeId,
        categoryId: pro.categoryId,
        name: "Produit",
        slug: `p-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        status: "ACTIVE",
        hasVariants: false,
        price: 5000,
        currency: "XOF",
        inventory: 10,
      },
      { userId: pro.userId },
    );

    const order = await orderService.createOrder(
      {
        storeId: pro.storeId,
        deliveryAddress: "Bamako",
        deliveryFee: 0,
        currency: "XOF",
        items: [{ productId: product.id, quantity: 1 }],
      },
      { userId: client.userId },
    );

    await orderService.markAsPaid(order.id);
    await orderService.shipOrder(order.id, {}, { userId: pro.userId });
    await orderService.deliverOrder(order.id, {}, { userId: pro.userId });

    return { pro, client, product, order };
  }

  /* ================================================================
   * POST /reviews
   * ================================================================ */

  describe("POST /reviews", () => {
    it("crée un avis et retourne 201", async () => {
      const { client, product, order } = await setupDeliveredOrder();
      const api = asUser(app, client.userId, { role: "CLIENT" });

      const res = await api.post(BASE).send({
        orderId: order.id,
        productId: product.id,
        rating: 5,
        comment: "Super produit",
      });

      expect(res.status).toBe(201);
      expect(res.body.data.rating).toBe(5);
    });

    it("retourne 400 si rating invalide", async () => {
      const { client, product, order } = await setupDeliveredOrder();
      const api = asUser(app, client.userId, { role: "CLIENT" });

      const res = await api.post(BASE).send({
        orderId: order.id,
        productId: product.id,
        rating: 10,  // > 5
      });

      expect(res.status).toBe(400);
    });

    it("retourne 401 sans auth", async () => {
      const { product, order } = await setupDeliveredOrder();

      const res = await require("supertest")(app).post(BASE).send({
        orderId: order.id,
        productId: product.id,
        rating: 5,
      });

      expect(res.status).toBe(401);
    });
  });

  /* ================================================================
   * GET /reviews/products/:productId
   * ================================================================ */

  describe("GET /reviews/products/:productId", () => {
    it("retourne les avis d'un produit", async () => {
      const { client, product, order } = await setupDeliveredOrder();
      const api = asUser(app, client.userId, { role: "CLIENT" });

      await api.post(BASE).send({
        orderId: order.id,
        productId: product.id,
        rating: 4,
      });

      const res = await require("supertest")(app).get(
        `${BASE}/products/${product.id}`,
      );

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
    });
  });

  /* ================================================================
   * GET /reviews/summary
   * ================================================================ */

  describe("GET /reviews/summary", () => {
    it("retourne le résumé des notes", async () => {
      const { client, product, order } = await setupDeliveredOrder();
      const api = asUser(app, client.userId, { role: "CLIENT" });

      await api.post(BASE).send({
        orderId: order.id,
        productId: product.id,
        rating: 5,
      });

      const res = await require("supertest")(app).get(
        `${BASE}/summary?productId=${product.id}`,
      );

      expect(res.status).toBe(200);
      expect(res.body.data.average).toBe(5);
    });
  });

  /* ================================================================
   * PATCH /reviews/:id
   * ================================================================ */

  describe("PATCH /reviews/:id", () => {
    it("met à jour un avis", async () => {
      const { client, product, order } = await setupDeliveredOrder();
      const api = asUser(app, client.userId, { role: "CLIENT" });

      const create = await api.post(BASE).send({
        orderId: order.id,
        productId: product.id,
        rating: 3,
      });

      const res = await api
        .patch(`${BASE}/${create.body.data.id}`)
        .send({ rating: 5, comment: "Finalement top" });

      expect(res.status).toBe(200);
      expect(res.body.data.rating).toBe(5);
    });
  });

  /* ================================================================
   * DELETE /reviews/:id
   * ================================================================ */

  describe("DELETE /reviews/:id", () => {
    it("supprime un avis par son auteur (soft delete)", async () => {
      const { client, product, order } = await setupDeliveredOrder();
      const api = asUser(app, client.userId, { role: "CLIENT" });

      const create = await api.post(BASE).send({
        orderId: order.id,
        productId: product.id,
        rating: 3,
      });

      const res = await api.delete(`${BASE}/${create.body.data.id}`);

      expect(res.status).toBe(200);

      const refreshed = await prisma.review.findUnique({
        where: { id: create.body.data.id },
      });
      expect(refreshed!.isVisible).toBe(false);
    });
  });

  /* ================================================================
   * REPORT
   * ================================================================ */

  describe("POST /reviews/:id/report", () => {
    it("signale un avis", async () => {
      const { client, product, order } = await setupDeliveredOrder();
      const other = await seedTenant(prisma);

      const apiClient = asUser(app, client.userId, { role: "CLIENT" });
      const create = await apiClient.post(BASE).send({
        orderId: order.id,
        productId: product.id,
        rating: 1,
      });

      const apiOther = asUser(app, other.userId, { role: "CLIENT" });
      const res = await apiOther
        .post(`${BASE}/${create.body.data.id}/report`)
        .send({ reason: "Contenu inapproprié" });

      expect(res.status).toBe(201);
      expect(res.body.data.status).toBe("PENDING");
    });
  });

  /* ================================================================
   * MODÉRATION
   * ================================================================ */

  describe("POST /reviews/:id/moderate", () => {
    it("modère un avis (admin)", async () => {
      const { client, product, order } = await setupDeliveredOrder();
      const admin = await seedTenant(prisma);

      const apiClient = asUser(app, client.userId, { role: "CLIENT" });
      const create = await apiClient.post(BASE).send({
        orderId: order.id,
        productId: product.id,
        rating: 5,
      });

      const apiAdmin = asUser(app, admin.userId, { role: "ADMIN" });
      const res = await apiAdmin
        .post(`${BASE}/${create.body.data.id}/moderate`)
        .send({ status: "REJECTED", reason: "Spam" });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe("REJECTED");
      expect(res.body.data.isVisible).toBe(false);
    });
  });
});