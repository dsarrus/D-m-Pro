// apps/api/src/modules/review/tests/review.service.integration.test.ts

import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";

import { PrismaClient } from "../../../generated/prisma/client";
import { startPostgres, stopPostgres } from "../../../../tests/setup/postgres";
import { seedTenant, truncateAll } from "../../../../tests/helpers/factories";

import { ReviewService } from "../services/review.service";
import { ReviewRepository } from "../repositories/review.repository";

import { OrderService } from "../../orders/services/order.service";
import { OrderRepository } from "../../orders/repositories/order.repository";
import { InventoryService } from "../../catalog/services/inventory.service";
import { InventoryRepository } from "../../catalog/repositories/inventory.repository";
import { ProductService } from "../../catalog/services/product.service";
import { ProductRepository } from "../../catalog/repositories/product.repository";
import { IdempotencyService } from "../../catalog/services/idempotency.service";

describe("ReviewService (integration)", () => {
  let prisma: PrismaClient;
  let service: ReviewService;
  let orderService: OrderService;
  let productService: ProductService;

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

    const reviewRepo = new ReviewRepository(prisma);
    service = new ReviewService(prisma, reviewRepo);
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

    /* Créer la commande */
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

    /* Marquer payée */
    await orderService.markAsPaid(order.id);

    /* Expédier */
    await orderService.shipOrder(order.id, {}, { userId: pro.userId });

    /* Livrer */
    await orderService.deliverOrder(order.id, {}, { userId: pro.userId });

    return { pro, client, product, order };
  }

  /* ================================================================
   * CREATE
   * ================================================================ */

  describe("createReview", () => {
    it("crée un avis vérifié", async () => {
      const { client, product, order } = await setupDeliveredOrder();

      const review = await service.createReview(
        {
          orderId: order.id,
          productId: product.id,
          rating: 5,
          comment: "Excellent produit !",
        },
        { userId: client.userId },
      );

      expect(review.id).toBeDefined();
      expect(review.rating).toBe(5);
      expect(review.isVerifiedPurchase).toBe(true);
      expect(review.status).toBe("APPROVED");
    });

    it("met à jour Store.ratingAverage et ratingCount", async () => {
      const { pro, client, product, order } = await setupDeliveredOrder();

      await service.createReview(
        {
          orderId: order.id,
          storeId: pro.storeId,
          rating: 4,
        },
        { userId: client.userId },
      );

      const store = await prisma.store.findUnique({
        where: { id: pro.storeId },
      });

      expect(store!.ratingAverage.toString()).toBe("4");
      expect(store!.ratingCount).toBe(1);
    });

    it("refuse si commande non livrée", async () => {
      const pro = await seedTenant(prisma);
      const client = await seedTenant(prisma);

      const { product } = await productService.createFull(
        {
          storeId: pro.storeId,
          categoryId: pro.categoryId,
          name: "Produit",
          slug: `p-${Date.now()}`,
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

      await expect(
        service.createReview(
          {
            orderId: order.id,
            productId: product.id,
            rating: 5,
          },
          { userId: client.userId },
        ),
      ).rejects.toMatchObject({
        code: "ORDER_NOT_DELIVERED",
      });
    });

    it("refuse si non-propriétaire de la commande", async () => {
      const { product, order } = await setupDeliveredOrder();
      const other = await seedTenant(prisma);

      await expect(
        service.createReview(
          {
            orderId: order.id,
            productId: product.id,
            rating: 5,
          },
          { userId: other.userId },
        ),
      ).rejects.toMatchObject({
        code: "UNAUTHORIZED_REVIEW",
      });
    });

    it("refuse un 2ᵉ avis pour la même commande", async () => {
      const { client, product, order } = await setupDeliveredOrder();

      await service.createReview(
        { orderId: order.id, productId: product.id, rating: 5 },
        { userId: client.userId },
      );

      await expect(
        service.createReview(
          { orderId: order.id, productId: product.id, rating: 3 },
          { userId: client.userId },
        ),
      ).rejects.toMatchObject({
        code: "REVIEW_ALREADY_EXISTS",
      });
    });
  });

  /* ================================================================
   * UPDATE
   * ================================================================ */

  describe("updateReview", () => {
    it("met à jour un avis dans la fenêtre", async () => {
      const { client, product, order } = await setupDeliveredOrder();

      const review = await service.createReview(
        { orderId: order.id, productId: product.id, rating: 3 },
        { userId: client.userId },
      );

      const updated = await service.updateReview(
        review.id,
        { rating: 5, comment: "En fait, c'est top" },
        { userId: client.userId },
      );

      expect(updated.rating).toBe(5);
      expect(updated.comment).toBe("En fait, c'est top");
    });

    it("refuse si non-auteur", async () => {
      const { client, product, order } = await setupDeliveredOrder();
      const other = await seedTenant(prisma);

      const review = await service.createReview(
        { orderId: order.id, productId: product.id, rating: 3 },
        { userId: client.userId },
      );

      await expect(
        service.updateReview(
          review.id,
          { rating: 1 },
          { userId: other.userId },
        ),
      ).rejects.toMatchObject({
        code: "UNAUTHORIZED_REVIEW",
      });
    });
  });

  /* ================================================================
   * DELETE
   * ================================================================ */

  describe("deleteReview", () => {
    it("soft delete par l'auteur", async () => {
      const { client, product, order } = await setupDeliveredOrder();

      const review = await service.createReview(
        { orderId: order.id, productId: product.id, rating: 3 },
        { userId: client.userId },
      );

      await service.deleteReview(review.id, { userId: client.userId });

      const refreshed = await prisma.review.findUnique({
        where: { id: review.id },
      });

      expect(refreshed!.isVisible).toBe(false);
    });

    it("hard delete par admin", async () => {
      const { client, product, order } = await setupDeliveredOrder();

      const review = await service.createReview(
        { orderId: order.id, productId: product.id, rating: 3 },
        { userId: client.userId },
      );

      await service.deleteReview(review.id, {
        userId: "admin-id",
        role: "ADMIN",
      });

      const refreshed = await prisma.review.findUnique({
        where: { id: review.id },
      });

      expect(refreshed).toBeNull();
    });
  });

  /* ================================================================
   * LIST
   * ================================================================ */

  describe("listByProduct", () => {
    it("retourne les avis visibles uniquement", async () => {
      const { client, product, order } = await setupDeliveredOrder();

      await service.createReview(
        { orderId: order.id, productId: product.id, rating: 5 },
        { userId: client.userId },
      );

      const result = await service.listByProduct(product.id, {});

      expect(result.data).toHaveLength(1);
    });
  });

  /* ================================================================
   * REPORT
   * ================================================================ */

  describe("reportReview", () => {
    it("crée un signalement", async () => {
      const { client, product, order } = await setupDeliveredOrder();
      const other = await seedTenant(prisma);

      const review = await service.createReview(
        { orderId: order.id, productId: product.id, rating: 1 },
        { userId: client.userId },
      );

      const report = await service.reportReview(
        review.id,
        { reason: "Contenu inapproprié" },
        { userId: other.userId },
      );

      expect(report.status).toBe("PENDING");
    });

    it("refuse de signaler son propre avis", async () => {
      const { client, product, order } = await setupDeliveredOrder();

      const review = await service.createReview(
        { orderId: order.id, productId: product.id, rating: 1 },
        { userId: client.userId },
      );

      await expect(
        service.reportReview(
          review.id,
          { reason: "Test" },
          { userId: client.userId },
        ),
      ).rejects.toMatchObject({
        code: "UNAUTHORIZED_REVIEW",
      });
    });

    it("refuse un 2ᵉ signalement du même user", async () => {
      const { client, product, order } = await setupDeliveredOrder();
      const other = await seedTenant(prisma);

      const review = await service.createReview(
        { orderId: order.id, productId: product.id, rating: 1 },
        { userId: client.userId },
      );

      await service.reportReview(
        review.id,
        { reason: "Test 1" },
        { userId: other.userId },
      );

      await expect(
        service.reportReview(
          review.id,
          { reason: "Test 2" },
          { userId: other.userId },
        ),
      ).rejects.toMatchObject({
        code: "REPORT_ALREADY_EXISTS",
      });
    });
  });

  /* ================================================================
   * MODÉRATION
   * ================================================================ */

  describe("moderateReview", () => {
    it("rejette un avis (admin)", async () => {
      const { client, product, order } = await setupDeliveredOrder();

      const review = await service.createReview(
        { orderId: order.id, productId: product.id, rating: 5 },
        { userId: client.userId },
      );

      const rejected = await service.moderateReview(
        review.id,
        { status: "REJECTED", reason: "Spam" },
        { userId: "admin-id", role: "ADMIN" },
      );

      expect(rejected.status).toBe("REJECTED");
      expect(rejected.isVisible).toBe(false);
    });

    it("refuse si non-admin", async () => {
      const { client, product, order } = await setupDeliveredOrder();

      const review = await service.createReview(
        { orderId: order.id, productId: product.id, rating: 5 },
        { userId: client.userId },
      );

      await expect(
        service.moderateReview(
          review.id,
          { status: "REJECTED" },
          { userId: client.userId, role: "CLIENT" },
        ),
      ).rejects.toMatchObject({
        code: "UNAUTHORIZED",
      });
    });
  });

  /* ================================================================
   * SUMMARY
   * ================================================================ */

  describe("getRatingSummary", () => {
    it("retourne la moyenne et la distribution", async () => {
      const { client, product, order } = await setupDeliveredOrder();

      await service.createReview(
        { orderId: order.id, productId: product.id, rating: 5 },
        { userId: client.userId },
      );

      const summary = await service.getRatingSummary({
        productId: product.id,
      });

      expect(summary.average).toBe(5);
      expect(summary.total).toBe(1);
      expect(summary.distribution[5]).toBe(1);
    });
  });
});