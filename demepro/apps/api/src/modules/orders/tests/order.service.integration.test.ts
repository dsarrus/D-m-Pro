// apps/api/src/modules/orders/tests/order.service.integration.test.ts

import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";

import { PrismaClient } from "../../../generated/prisma/client";
import { startPostgres, stopPostgres } from "../../../../tests/setup/postgres";
import { seedTenant, truncateAll } from "../../../../tests/helpers/factories";

import { OrderService } from "../services/order.service";
import { OrderRepository } from "../repositories/order.repository";

import { InventoryService } from "../../catalog/services/inventory.service";
import { InventoryRepository } from "../../catalog/repositories/inventory.repository";

import { ProductService } from "../../catalog/services/product.service";
import { ProductRepository } from "../../catalog/repositories/product.repository";
import { IdempotencyService } from "../../catalog/services/idempotency.service";

describe("OrderService (integration)", () => {
  let prisma: PrismaClient;
  let service: OrderService;
  let inventoryService: InventoryService;
  let productService: ProductService;

  beforeAll(async () => {
    const ctx = await startPostgres();
    prisma = ctx.prisma;

    const inventoryRepo = new InventoryRepository(prisma);
    inventoryService = new InventoryService(prisma, inventoryRepo);

    const productRepo = new ProductRepository(prisma);
    const idempotency = new IdempotencyService(prisma);
    productService = new ProductService(prisma, productRepo, idempotency);

    const orderRepo = new OrderRepository(prisma);
    service = new OrderService(prisma, orderRepo, inventoryService);
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

  async function setupStoreWithProduct(stock = 10) {
    /* Tenant A = professionnel (propriétaire de la boutique) */
    const tenantA = await seedTenant(prisma);

    /* Tenant B = client */
    const tenantB = await seedTenant(prisma);

    /* Créer un produit avec stock */
    const { product } = await productService.createFull(
      {
        storeId: tenantA.storeId,
        categoryId: tenantA.categoryId,
        name: "Produit test",
        slug: `produit-${Date.now()}-${Math.random()}`,
        status: "ACTIVE",
        hasVariants: false,
        price: 5000,
        currency: "XOF",
        inventory: stock,
      },
      { userId: tenantA.userId },
    );

    return {
      pro: tenantA,
      client: tenantB,
      product,
      storeId: tenantA.storeId,
    };
  }

  /* ================================================================
   * CREATE
   * ================================================================ */

  describe("createOrder", () => {
    it("crée une commande simple avec réservation de stock", async () => {
      const { client, product, storeId } = await setupStoreWithProduct(10);

      const order = await service.createOrder(
        {
          storeId,
          deliveryAddress: "Bamako, Hamdallaye",
          deliveryFee: 1000,
          currency: "XOF",
          items: [{ productId: product.id, quantity: 3 }],
        },
        { userId: client.userId },
      );

      expect(order.status).toBe("PENDING");
      expect(order.items).toHaveLength(1);
      expect(order.items[0].quantity).toBe(3);
      expect(order.items[0].productName).toBe("Produit test");

      /* Total = 3 * 5000 + 1000 = 16000 */
      expect(order.totalAmount.toString()).toBe("16000");

      /* Vérifier la réservation de stock */
      const inventory = await prisma.inventory.findUnique({
        where: { productId: product.id },
      });
      expect(inventory!.reserved).toBe(3);
    });

    it("refuse une commande vide", async () => {
      const { client, storeId } = await setupStoreWithProduct();

      await expect(
        service.createOrder(
          {
            storeId,
            deliveryAddress: "Bamako",
            deliveryFee: 0,
            currency: "XOF",
            items: [],
          },
          { userId: client.userId },
        ),
      ).rejects.toMatchObject({
        code: "EMPTY_ORDER",
      });
    });

    it("refuse si le client commande dans sa propre boutique", async () => {
      const { pro, product, storeId } = await setupStoreWithProduct();

      await expect(
        service.createOrder(
          {
            storeId,
            deliveryAddress: "Bamako",
            deliveryFee: 0,
            currency: "XOF",
            items: [{ productId: product.id, quantity: 1 }],
          },
          { userId: pro.userId },
        ),
      ).rejects.toMatchObject({
        code: "UNAUTHORIZED_ORDER",
      });
    });

    it("refuse si le stock est insuffisant", async () => {
      const { client, product, storeId } = await setupStoreWithProduct(2);

      await expect(
        service.createOrder(
          {
            storeId,
            deliveryAddress: "Bamako",
            deliveryFee: 0,
            currency: "XOF",
            items: [{ productId: product.id, quantity: 5 }],
          },
          { userId: client.userId },
        ),
      ).rejects.toMatchObject({
        code: "INSUFFICIENT_STOCK",
      });
    });

    it("refuse si le produit n'est pas ACTIVE", async () => {
      const { pro, client, product, storeId } = await setupStoreWithProduct();

      /* Archiver le produit */
      await productService.archiveProduct(product.id, {
        userId: pro.userId,
      });

      await expect(
        service.createOrder(
          {
            storeId,
            deliveryAddress: "Bamako",
            deliveryFee: 0,
            currency: "XOF",
            items: [{ productId: product.id, quantity: 1 }],
          },
          { userId: client.userId },
        ),
      ).rejects.toMatchObject({
        code: "PRODUCT_NOT_ACTIVE",
      });
    });

    it("ROLLBACK complet si un item échoue (atomicité)", async () => {
      const { client, product, storeId } = await setupStoreWithProduct(10);

      /* Créer un 2ème produit avec stock 0 */
      const { product: product2 } = await productService.createFull(
        {
          storeId,
          categoryId: (await prisma.product.findUnique({ where: { id: product.id } }))!.categoryId,
          name: "Produit 2",
          slug: `p2-${Date.now()}`,
          status: "ACTIVE",
          hasVariants: false,
          price: 3000,
          currency: "XOF",
          inventory: 0,
        },
        { userId: (await prisma.store.findUnique({ where: { id: storeId }, include: { professional: true } }))!.professional.userId },
      );

      /* Tenter une commande avec 2 items dont 1 en rupture */
      await expect(
        service.createOrder(
          {
            storeId,
            deliveryAddress: "Bamako",
            deliveryFee: 0,
            currency: "XOF",
            items: [
              { productId: product.id, quantity: 2 },
              { productId: product2.id, quantity: 5 },
            ],
          },
          { userId: client.userId },
        ),
      ).rejects.toMatchObject({
        code: "INSUFFICIENT_STOCK",
      });

      /* Vérifier que le 1er produit n'a PAS été réservé */
      const inventory1 = await prisma.inventory.findUnique({
        where: { productId: product.id },
      });
      expect(inventory1!.reserved).toBe(0);
    });
  });

  /* ================================================================
   * CONCURRENCE
   * ================================================================ */

  describe("createOrder — concurrence", () => {
    it("empêche la survente sous concurrence (stock=1, 5 commandes)", async () => {
      const { client, product, storeId } = await setupStoreWithProduct(1);

      /* Créer 5 clients différents */
      const clients = await Promise.all(
        Array.from({ length: 5 }, () => seedTenant(prisma)),
      );

      const results = await Promise.allSettled(
        clients.map((c) =>
          service.createOrder(
            {
              storeId,
              deliveryAddress: "Bamako",
              deliveryFee: 0,
              currency: "XOF",
              items: [{ productId: product.id, quantity: 1 }],
            },
            { userId: c.userId },
          ),
        ),
      );

      const fulfilled = results.filter((r) => r.status === "fulfilled");
      expect(fulfilled).toHaveLength(1);

      const inventory = await prisma.inventory.findUnique({
        where: { productId: product.id },
      });
      expect(inventory!.reserved).toBe(1);
    });
  });

  /* ================================================================
   * CYCLE DE VIE
   * ================================================================ */

  describe("shipOrder / deliverOrder", () => {
    it("expédie une commande PAID", async () => {
      const { pro, client, product, storeId } = await setupStoreWithProduct();

      const order = await service.createOrder(
        {
          storeId,
          deliveryAddress: "Bamako",
          deliveryFee: 0,
          currency: "XOF",
          items: [{ productId: product.id, quantity: 1 }],
        },
        { userId: client.userId },
      );

      /* Marquer comme payé */
      await service.markAsPaid(order.id);

      /* Expédier */
      const shipped = await service.shipOrder(
        order.id,
        { trackingNumber: "TRACK-123" },
        { userId: pro.userId },
      );

      expect(shipped.status).toBe("SHIPPED");
      expect(shipped.shippedAt).toBeDefined();
    });

    it("livre une commande SHIPPED", async () => {
      const { pro, client, product, storeId } = await setupStoreWithProduct();

      const order = await service.createOrder(
        {
          storeId,
          deliveryAddress: "Bamako",
          deliveryFee: 0,
          currency: "XOF",
          items: [{ productId: product.id, quantity: 1 }],
        },
        { userId: client.userId },
      );

      await service.markAsPaid(order.id);
      await service.shipOrder(order.id, {}, { userId: pro.userId });

      const delivered = await service.deliverOrder(
        order.id,
        {},
        { userId: pro.userId },
      );

      expect(delivered.status).toBe("DELIVERED");
      expect(delivered.deliveredAt).toBeDefined();
    });

    it("refuse de livrer une commande PENDING", async () => {
      const { pro, client, product, storeId } = await setupStoreWithProduct();

      const order = await service.createOrder(
        {
          storeId,
          deliveryAddress: "Bamako",
          deliveryFee: 0,
          currency: "XOF",
          items: [{ productId: product.id, quantity: 1 }],
        },
        { userId: client.userId },
      );

      await expect(
        service.deliverOrder(order.id, {}, { userId: pro.userId }),
      ).rejects.toMatchObject({
        code: "INVALID_ORDER_STATE",
      });
    });
  });

  /* ================================================================
   * CANCEL
   * ================================================================ */

  describe("cancelOrder", () => {
    it("annule une commande PENDING et libère le stock", async () => {
      const { client, product, storeId } = await setupStoreWithProduct(10);

      const order = await service.createOrder(
        {
          storeId,
          deliveryAddress: "Bamako",
          deliveryFee: 0,
          currency: "XOF",
          items: [{ productId: product.id, quantity: 3 }],
        },
        { userId: client.userId },
      );

      /* Vérifier la réservation */
      let inventory = await prisma.inventory.findUnique({
        where: { productId: product.id },
      });
      expect(inventory!.reserved).toBe(3);

      /* Annuler */
      const cancelled = await service.cancelOrder(
        order.id,
        { reason: "Changement d'avis" },
        { userId: client.userId },
      );

      expect(cancelled.status).toBe("CANCELLED");
      expect(cancelled.canceledAt).toBeDefined();

      /* Vérifier que le stock est libéré */
      inventory = await prisma.inventory.findUnique({
        where: { productId: product.id },
      });
      expect(inventory!.reserved).toBe(0);
    });

    it("refuse d'annuler une commande SHIPPED", async () => {
      const { pro, client, product, storeId } = await setupStoreWithProduct();

      const order = await service.createOrder(
        {
          storeId,
          deliveryAddress: "Bamako",
          deliveryFee: 0,
          currency: "XOF",
          items: [{ productId: product.id, quantity: 1 }],
        },
        { userId: client.userId },
      );

      await service.markAsPaid(order.id);
      await service.shipOrder(order.id, {}, { userId: pro.userId });

      await expect(
        service.cancelOrder(
          order.id,
          { reason: "Trop tard" },
          { userId: client.userId },
        ),
      ).rejects.toMatchObject({
        code: "INVALID_ORDER_STATE",
      });
    });
  });

  /* ================================================================
   * MARK AS PAID
   * ================================================================ */

  describe("markAsPaid", () => {
    it("commit le stock après paiement", async () => {
      const { client, product, storeId } = await setupStoreWithProduct(10);

      const order = await service.createOrder(
        {
          storeId,
          deliveryAddress: "Bamako",
          deliveryFee: 0,
          currency: "XOF",
          items: [{ productId: product.id, quantity: 4 }],
        },
        { userId: client.userId },
      );

      /* Vérifier réservé */
      let inventory = await prisma.inventory.findUnique({
        where: { productId: product.id },
      });
      expect(inventory!.reserved).toBe(4);
      expect(inventory!.quantity).toBe(10);

      /* Marquer comme payé */
      const paid = await service.markAsPaid(order.id);

      expect(paid.status).toBe("PAID");

      /* Vérifier commit */
      inventory = await prisma.inventory.findUnique({
        where: { productId: product.id },
      });
      expect(inventory!.reserved).toBe(0);
      expect(inventory!.quantity).toBe(6);
    });
  });

  /* ================================================================
   * OWNERSHIP
   * ================================================================ */

  describe("ownership", () => {
    it("refuse de voir la commande d'un autre client", async () => {
      const { client, product, storeId } = await setupStoreWithProduct();
      const otherClient = await seedTenant(prisma);

      const order = await service.createOrder(
        {
          storeId,
          deliveryAddress: "Bamako",
          deliveryFee: 0,
          currency: "XOF",
          items: [{ productId: product.id, quantity: 1 }],
        },
        { userId: client.userId },
      );

      await expect(
        service.getOrder(order.id, { userId: otherClient.userId }),
      ).rejects.toMatchObject({
        code: "UNAUTHORIZED_ORDER",
      });
    });
  });
});