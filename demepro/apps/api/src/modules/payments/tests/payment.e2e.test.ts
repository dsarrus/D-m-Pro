// apps/api/src/modules/payment/tests/payment.e2e.test.ts

import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import type { Express } from "express";
import request from "supertest";

import { PrismaClient } from "../../../generated/prisma/client";
import { startPostgres, stopPostgres } from "../../../../tests/setup/postgres";
import { seedTenant, truncateAll } from "../../../../tests/helpers/factories";
import { createTestApp } from "../../../../tests/setup/test-app";
import { asUser } from "../../../../tests/helpers/auth";

import { ProductService } from "../../catalog/services/product.service";
import { ProductRepository } from "../../catalog/repositories/product.repository";
import { IdempotencyService } from "../../catalog/services/idempotency.service";
import { OrderService } from "../../orders/services/order.service";
import { OrderRepository } from "../../orders/repositories/order.repository";
import { InventoryService } from "../../catalog/services/inventory.service";
import { InventoryRepository } from "../../catalog/repositories/inventory.repository";
import { MockProvider } from "../providers/mock.provider";

describe("Payment HTTP (E2E)", () => {
  let prisma: PrismaClient;
  let app: Express;
  let productService: ProductService;
  let orderService: OrderService;
  let mockProvider: MockProvider;

  beforeAll(async () => {
    const ctx = await startPostgres();
    prisma = ctx.prisma;
    app = createTestApp();

    const productRepo = new ProductRepository(prisma);
    const idempotency = new IdempotencyService(prisma);
    productService = new ProductService(prisma, productRepo, idempotency);

    const inventoryRepo = new InventoryRepository(prisma);
    const inventoryService = new InventoryService(prisma, inventoryRepo);

    const orderRepo = new OrderRepository(prisma);
    orderService = new OrderService(prisma, orderRepo, inventoryService);

    mockProvider = new MockProvider();
  });

  afterAll(async () => {
    await stopPostgres();
  });

  beforeEach(async () => {
    await truncateAll(prisma);
  });

  const BASE = "/api/v1";

  /* ================================================================
   * HELPERS
   * ================================================================ */

  async function setupOrder(stock = 10) {
    const pro = await seedTenant(prisma);
    const client = await seedTenant(prisma);

    const { product } = await productService.createFull(
      {
        storeId: pro.storeId,
        categoryId: pro.categoryId,
        name: "Produit test",
        slug: `p-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        status: "ACTIVE",
        hasVariants: false,
        price: 5000,
        currency: "XOF",
        inventory: stock,
      },
      { userId: pro.userId },
    );

    const order = await orderService.createOrder(
      {
        storeId: pro.storeId,
        deliveryAddress: "Bamako",
        deliveryFee: 1000,
        currency: "XOF",
        items: [{ productId: product.id, quantity: 2 }],
      },
      { userId: client.userId },
    );

    return { pro, client, product, order };
  }

  /* ================================================================
   * POST /orders/:id/payment
   * ================================================================ */

  describe("POST /orders/:id/payment", () => {
    it("initie un paiement et retourne 201", async () => {
      const { client, order } = await setupOrder();
      const api = asUser(app, client.userId, { role: "CLIENT" });

      const res = await api
        .post(`${BASE}/orders/${order.id}/payment`)
        .send({ provider: "MOCK" });

      expect(res.status).toBe(201);
      expect(res.body.data.payment.status).toBe("PROCESSING");
      expect(res.body.data.payment.providerRef).toBeDefined();
      expect(res.body.data.redirectUrl).toBeDefined();
    });

    it("retourne 401 sans auth", async () => {
      const { order } = await setupOrder();

      const res = await request(app)
        .post(`${BASE}/orders/${order.id}/payment`)
        .send({ provider: "MOCK" });

      expect(res.status).toBe(401);
    });

    it("retourne 403 si non-propriétaire", async () => {
      const { order } = await setupOrder();
      const otherClient = await seedTenant(prisma);
      const api = asUser(app, otherClient.userId, { role: "CLIENT" });

      const res = await api
        .post(`${BASE}/orders/${order.id}/payment`)
        .send({ provider: "MOCK" });

      expect(res.status).toBe(403);
    });
  });

  /* ================================================================
   * POST /webhooks/payment/:provider
   * ================================================================ */

  describe("POST /webhooks/payment/:provider", () => {
    it("traite un webhook PAID et met à jour Order", async () => {
      const { client, order } = await setupOrder();

      /* 1. Initier le paiement */
      const api = asUser(app, client.userId, { role: "CLIENT" });
      const init = await api
        .post(`${BASE}/orders/${order.id}/payment`)
        .send({ provider: "MOCK" });

      const providerRef = init.body.data.payment.providerRef;

      /* 2. Simuler un webhook */
      const webhook = mockProvider.signWebhookPayload({
        providerRef,
        status: "PAID",
        amount: 11000,
      });

      const res = await request(app)
        .post(`${BASE}/webhooks/payment/MOCK`)
        .set("Content-Type", "application/json")
        .set("X-Webhook-Signature", webhook.signature)
        .send(webhook.body);

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe("PAID");
      expect(res.body.data.idempotent).toBe(false);

      /* 3. Vérifier l'Order */
      const refreshedOrder = await prisma.order.findUnique({
        where: { id: order.id },
      });
      expect(refreshedOrder!.status).toBe("PAID");
    });

    it("retourne 401 avec signature invalide", async () => {
      const { client, order } = await setupOrder();

      const api = asUser(app, client.userId, { role: "CLIENT" });
      const init = await api
        .post(`${BASE}/orders/${order.id}/payment`)
        .send({ provider: "MOCK" });

      const providerRef = init.body.data.payment.providerRef;

      const webhook = mockProvider.signWebhookPayload({
        providerRef,
        status: "PAID",
        amount: 11000,
      });

      const res = await request(app)
        .post(`${BASE}/webhooks/payment/MOCK`)
        .set("Content-Type", "application/json")
        .set("X-Webhook-Signature", "invalid")
        .send(webhook.body);

      expect(res.status).toBe(401);
    });

    it("est idempotent (2 appels du même webhook)", async () => {
      const { client, order } = await setupOrder();

      const api = asUser(app, client.userId, { role: "CLIENT" });
      const init = await api
        .post(`${BASE}/orders/${order.id}/payment`)
        .send({ provider: "MOCK" });

      const providerRef = init.body.data.payment.providerRef;

      const webhook = mockProvider.signWebhookPayload({
        providerRef,
        status: "PAID",
        amount: 11000,
      });

      const first = await request(app)
        .post(`${BASE}/webhooks/payment/MOCK`)
        .set("Content-Type", "application/json")
        .set("X-Webhook-Signature", webhook.signature)
        .send(webhook.body);

      const second = await request(app)
        .post(`${BASE}/webhooks/payment/MOCK`)
        .set("Content-Type", "application/json")
        .set("X-Webhook-Signature", webhook.signature)
        .send(webhook.body);

      expect(first.status).toBe(200);
      expect(second.status).toBe(200);
      expect(second.body.data.idempotent).toBe(true);
    });
  });

  /* ================================================================
   * GET /orders/:id/payment
   * ================================================================ */

  describe("GET /orders/:id/payment", () => {
    it("retourne le paiement au client", async () => {
      const { client, order } = await setupOrder();
      const api = asUser(app, client.userId, { role: "CLIENT" });

      await api
        .post(`${BASE}/orders/${order.id}/payment`)
        .send({ provider: "MOCK" });

      const res = await api.get(`${BASE}/orders/${order.id}/payment`);

      expect(res.status).toBe(200);
      expect(res.body.data.orderId).toBe(order.id);
    });
  });

  /* ================================================================
   * REFUND
   * ================================================================ */

  describe("POST /orders/:id/payment/refund", () => {
    it("rembourse un paiement PAID", async () => {
      const { client, order } = await setupOrder();

      const api = asUser(app, client.userId, { role: "CLIENT" });
      const init = await api
        .post(`${BASE}/orders/${order.id}/payment`)
        .send({ provider: "MOCK" });

      const providerRef = init.body.data.payment.providerRef;

      const webhook = mockProvider.signWebhookPayload({
        providerRef,
        status: "PAID",
        amount: 11000,
      });

      await request(app)
        .post(`${BASE}/webhooks/payment/MOCK`)
        .set("Content-Type", "application/json")
        .set("X-Webhook-Signature", webhook.signature)
        .send(webhook.body);

      const res = await api
        .post(`${BASE}/orders/${order.id}/payment/refund`)
        .send({});

      expect(res.status).toBe(200);
      expect(res.body.data.payment.status).toBe("REFUNDED");
      expect(res.body.data.refundRef).toBeDefined();
    });
  });
});