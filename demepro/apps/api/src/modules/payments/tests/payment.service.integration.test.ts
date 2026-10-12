// apps/api/src/modules/payment/tests/payment.service.integration.test.ts

import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";

import { PrismaClient } from "../../../generated/prisma/client";
import { startPostgres, stopPostgres } from "../../../../tests/setup/postgres";
import { seedTenant, truncateAll } from "../../../../tests/helpers/factories";

import { PaymentService } from "../services/payment.service";
import { PaymentRepository } from "../repositories/payment.repository";

import { OrderService } from "../../orders/services/order.service";
import { OrderRepository } from "../../orders/repositories/order.repository";

import { InventoryService } from "../../catalog/services/inventory.service";
import { InventoryRepository } from "../../catalog/repositories/inventory.repository";

import { ProductService } from "../../catalog/services/product.service";
import { ProductRepository } from "../../catalog/repositories/product.repository";
import { IdempotencyService } from "../../catalog/services/idempotency.service";

import { MockProvider } from "../providers/mock.provider";

describe("PaymentService (integration)", () => {
  let prisma: PrismaClient;
  let service: PaymentService;
  let orderService: OrderService;
  let productService: ProductService;
  let mockProvider: MockProvider;

  beforeAll(async () => {
    const ctx = await startPostgres();
    prisma = ctx.prisma;

    const inventoryRepo = new InventoryRepository(prisma);
    const inventoryService = new InventoryService(prisma, inventoryRepo);

    const productRepo = new ProductRepository(prisma);
    const idempotency = new IdempotencyService(prisma);
    productService = new ProductService(prisma, productRepo, idempotency);

    const orderRepo = new OrderRepository(prisma);
    orderService = new OrderService(prisma, orderRepo, inventoryService);

    const paymentRepo = new PaymentRepository(prisma);
    service = new PaymentService(prisma, paymentRepo, orderService);

    mockProvider = new MockProvider();
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
   * INITIATE
   * ================================================================ */

  describe("initiatePayment", () => {
    it("crée un Payment PROCESSING avec providerRef", async () => {
      const { client, order } = await setupOrder();

      const result = await service.initiatePayment(
        order.id,
        { provider: "MOCK" },
        { userId: client.userId },
      );

      expect(result.payment.status).toBe("PROCESSING");
      expect(result.payment.providerRef).toBeDefined();
      expect(result.payment.provider).toBe("MOCK");
      expect(result.redirectUrl).toBeDefined();
    });

    it("refuse si la commande n'appartient pas au client", async () => {
      const { order } = await setupOrder();
      const otherClient = await seedTenant(prisma);

      await expect(
        service.initiatePayment(
          order.id,
          { provider: "MOCK" },
          { userId: otherClient.userId },
        ),
      ).rejects.toMatchObject({
        code: "UNAUTHORIZED_PAYMENT",
      });
    });

    it("refuse si la commande n'est pas PENDING", async () => {
      const { client, order } = await setupOrder();

      /* Payer une première fois */
      await service.initiatePayment(
        order.id,
        { provider: "MOCK" },
        { userId: client.userId },
      );

      await expect(
        service.initiatePayment(
          order.id,
          { provider: "MOCK" },
          { userId: client.userId },
        ),
      ).rejects.toMatchObject({
        code: "PAYMENT_ALREADY_EXISTS",
      });
    });

    it("refuse le provider CASH_ON_DELIVERY", async () => {
      const { client, order } = await setupOrder();

      await expect(
        service.initiatePayment(
          order.id,
          { provider: "CASH_ON_DELIVERY" as any },
          { userId: client.userId },
        ),
      ).rejects.toMatchObject({
        code: "PAYMENT_PROVIDER_NOT_SUPPORTED",
      });
    });
  });

  /* ================================================================
   * WEBHOOK
   * ================================================================ */

  describe("handleWebhook", () => {
    it("marque Payment PAID et commit le stock", async () => {
      const { client, product, order } = await setupOrder(10);

      /* Initier */
      const init = await service.initiatePayment(
        order.id,
        { provider: "MOCK" },
        { userId: client.userId },
      );

      /* Simuler le webhook */
      const webhook = mockProvider.signWebhookPayload({
        providerRef: init.payment.providerRef!,
        status: "PAID",
        amount: 11000,
      });

      const result = await service.handleWebhook(
        "MOCK",
        webhook.body,
        webhook.signature,
      );

      expect(result.payment.status).toBe("PAID");
      expect(result.idempotent).toBe(false);

      /* Vérifier le commit du stock */
      const inventory = await prisma.inventory.findUnique({
        where: { productId: product.id },
      });
      expect(inventory!.reserved).toBe(0);
      expect(inventory!.quantity).toBe(8);

      /* Vérifier l'Order */
      const refreshedOrder = await prisma.order.findUnique({
        where: { id: order.id },
      });
      expect(refreshedOrder!.status).toBe("PAID");
    });

    it("est idempotent (2 appels du même webhook)", async () => {
      const { client, order } = await setupOrder();

      const init = await service.initiatePayment(
        order.id,
        { provider: "MOCK" },
        { userId: client.userId },
      );

      const webhook = mockProvider.signWebhookPayload({
        providerRef: init.payment.providerRef!,
        status: "PAID",
        amount: 11000,
      });

      const first = await service.handleWebhook(
        "MOCK",
        webhook.body,
        webhook.signature,
      );

      const second = await service.handleWebhook(
        "MOCK",
        webhook.body,
        webhook.signature,
      );

      expect(first.idempotent).toBe(false);
      expect(second.idempotent).toBe(true);
      expect(second.payment.status).toBe("PAID");
    });

    it("refuse une signature invalide", async () => {
      const { client, order } = await setupOrder();

      const init = await service.initiatePayment(
        order.id,
        { provider: "MOCK" },
        { userId: client.userId },
      );

      const webhook = mockProvider.signWebhookPayload({
        providerRef: init.payment.providerRef!,
        status: "PAID",
        amount: 11000,
      });

      await expect(
        service.handleWebhook("MOCK", webhook.body, "invalid-signature"),
      ).rejects.toMatchObject({
        code: "PAYMENT_WEBHOOK_INVALID_SIGNATURE",
      });
    });

    it("marque FAILED si le webhook dit FAILED", async () => {
      const { client, order } = await setupOrder();

      const init = await service.initiatePayment(
        order.id,
        { provider: "MOCK" },
        { userId: client.userId },
      );

      const webhook = mockProvider.signWebhookPayload({
        providerRef: init.payment.providerRef!,
        status: "FAILED",
        amount: 11000,
      });

      const result = await service.handleWebhook(
        "MOCK",
        webhook.body,
        webhook.signature,
      );

      expect(result.payment.status).toBe("FAILED");
    });
  });

  /* ================================================================
   * REFUND
   * ================================================================ */

  describe("refundPayment", () => {
    it("rembourse un paiement PAID", async () => {
      const { client, order } = await setupOrder();

      const init = await service.initiatePayment(
        order.id,
        { provider: "MOCK" },
        { userId: client.userId },
      );

      const webhook = mockProvider.signWebhookPayload({
        providerRef: init.payment.providerRef!,
        status: "PAID",
        amount: 11000,
      });

      await service.handleWebhook("MOCK", webhook.body, webhook.signature);

      const refund = await service.refundPayment(
        order.id,
        {},
        { userId: client.userId },
      );

      expect(refund.payment.status).toBe("REFUNDED");
      expect(refund.refundRef).toBeDefined();
    });

    it("refuse si le paiement n'est pas PAID", async () => {
      const { client, order } = await setupOrder();

      await service.initiatePayment(
        order.id,
        { provider: "MOCK" },
        { userId: client.userId },
      );

      await expect(
        service.refundPayment(order.id, {}, { userId: client.userId }),
      ).rejects.toMatchObject({
        code: "REFUND_NOT_ALLOWED",
      });
    });

    it("refuse si non-propriétaire", async () => {
      const { client, order } = await setupOrder();
      const otherClient = await seedTenant(prisma);

      const init = await service.initiatePayment(
        order.id,
        { provider: "MOCK" },
        { userId: client.userId },
      );

      const webhook = mockProvider.signWebhookPayload({
        providerRef: init.payment.providerRef!,
        status: "PAID",
        amount: 11000,
      });

      await service.handleWebhook("MOCK", webhook.body, webhook.signature);

      await expect(
        service.refundPayment(order.id, {}, { userId: otherClient.userId }),
      ).rejects.toMatchObject({
        code: "UNAUTHORIZED_PAYMENT",
      });
    });
  });

  /* ================================================================
   * GET
   * ================================================================ */

  describe("getPaymentByOrder", () => {
    it("retourne le paiement du client propriétaire", async () => {
      const { client, order } = await setupOrder();

      await service.initiatePayment(
        order.id,
        { provider: "MOCK" },
        { userId: client.userId },
      );

      const payment = await service.getPaymentByOrder(order.id, {
        userId: client.userId,
      });

      expect(payment.orderId).toBe(order.id);
    });

    it("retourne le paiement au pro de la boutique", async () => {
      const { pro, client, order } = await setupOrder();

      await service.initiatePayment(
        order.id,
        { provider: "MOCK" },
        { userId: client.userId },
      );

      const payment = await service.getPaymentByOrder(order.id, {
        userId: pro.userId,
      });

      expect(payment.orderId).toBe(order.id);
    });

    it("refuse à un tiers", async () => {
      const { client, order } = await setupOrder();
      const otherClient = await seedTenant(prisma);

      await service.initiatePayment(
        order.id,
        { provider: "MOCK" },
        { userId: client.userId },
      );

      await expect(
        service.getPaymentByOrder(order.id, {
          userId: otherClient.userId,
        }),
      ).rejects.toMatchObject({
        code: "UNAUTHORIZED_PAYMENT",
      });
    });
  });
});