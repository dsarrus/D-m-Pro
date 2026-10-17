// apps/api/src/modules/payments/tests/payment.booking.integration.test.ts

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

describe("PaymentService — Booking (integration)", () => {
  let prisma: PrismaClient;
  let service: PaymentService;

  beforeAll(async () => {
    const ctx = await startPostgres();
    prisma = ctx.prisma;

    const inventoryRepo = new InventoryRepository(prisma);
    const inventoryService = new InventoryService(prisma, inventoryRepo);
    const orderRepo = new OrderRepository(prisma);
    const orderService = new OrderService(prisma, orderRepo, inventoryService);
    const paymentRepo = new PaymentRepository(prisma);

    service = new PaymentService(prisma, paymentRepo, orderService);
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

  async function setupConfirmedBooking() {
    const pro = await seedTenant(prisma);
    const client = await seedTenant(prisma);

    const svc = await prisma.service.create({
      data: {
        professionalId: pro.professionalId,
        categoryId: pro.categoryId,
        name: "Réparation fuite",
        slug: `svc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        pricingModel: "FIXED",
        basePrice: 25000,
        status: "ACTIVE",
      },
    });

    const booking = await prisma.booking.create({
      data: {
        serviceId: svc.id,
        userId: client.userId,
        status: "CONFIRMED",
        scheduledAt: new Date(Date.now() + 7 * 864e5),
        totalAmount: 25000,
        currency: "XOF",
      },
    });

    return { pro, client, service: svc, booking };
  }

  /* ================================================================
   * INITIATE
   * ================================================================ */

  describe("initiateBookingPayment", () => {
    it("crée un Payment PROCESSING avec providerRef", async () => {
      const { client, booking } = await setupConfirmedBooking();

      const result = await service.initiateBookingPayment(
        booking.id,
        { provider: "MOCK" },
        { userId: client.userId, role: "CLIENT" },
      );

      expect(result.payment.id).toBeDefined();
      expect(result.payment.status).toBe("PROCESSING");
      expect(result.payment.providerRef).toBeDefined();
      expect(result.payment.bookingId).toBe(booking.id);
    });

    it("refuse si le booking n'appartient pas au client", async () => {
      const { booking } = await setupConfirmedBooking();
      const other = await seedTenant(prisma);

      await expect(
        service.initiateBookingPayment(
          booking.id,
          { provider: "MOCK" },
          { userId: other.userId, role: "CLIENT" },
        ),
      ).rejects.toMatchObject({ code: "UNAUTHORIZED_PAYMENT" });
    });

    it("refuse si le booking est CANCELLED", async () => {
      const { client, booking } = await setupConfirmedBooking();
      await prisma.booking.update({
        where: { id: booking.id },
        data: { status: "CANCELLED" },
      });

      await expect(
        service.initiateBookingPayment(
          booking.id,
          { provider: "MOCK" },
          { userId: client.userId, role: "CLIENT" },
        ),
      ).rejects.toMatchObject({ code: "BOOKING_NOT_PAYABLE" });
    });

    it("refuse si un Payment existe déjà", async () => {
      const { client, booking } = await setupConfirmedBooking();
      await service.initiateBookingPayment(
        booking.id,
        { provider: "MOCK" },
        { userId: client.userId, role: "CLIENT" },
      );

      await expect(
        service.initiateBookingPayment(
          booking.id,
          { provider: "MOCK" },
          { userId: client.userId, role: "CLIENT" },
        ),
      ).rejects.toMatchObject({ code: "PAYMENT_ALREADY_EXISTS" });
    });
  });

  /* ================================================================
   * GET
   * ================================================================ */

  describe("getPaymentByBooking", () => {
    it("retourne le paiement au client", async () => {
      const { client, booking } = await setupConfirmedBooking();
      await service.initiateBookingPayment(
        booking.id,
        { provider: "MOCK" },
        { userId: client.userId, role: "CLIENT" },
      );

      const payment = await service.getPaymentByBooking(booking.id, {
        userId: client.userId,
        role: "CLIENT",
      });

      expect(payment).not.toBeNull();
      expect(payment!.bookingId).toBe(booking.id);
    });

    it("retourne le paiement au pro du service", async () => {
      const { pro, client, booking } = await setupConfirmedBooking();
      await service.initiateBookingPayment(
        booking.id,
        { provider: "MOCK" },
        { userId: client.userId, role: "CLIENT" },
      );

      const payment = await service.getPaymentByBooking(booking.id, {
        userId: pro.userId,
        role: "PROFESSIONAL",
      });

      expect(payment).not.toBeNull();
    });

    it("refuse à un tiers", async () => {
      const { client, booking } = await setupConfirmedBooking();
      const other = await seedTenant(prisma);
      await service.initiateBookingPayment(
        booking.id,
        { provider: "MOCK" },
        { userId: client.userId, role: "CLIENT" },
      );

      await expect(
        service.getPaymentByBooking(booking.id, {
          userId: other.userId,
          role: "CLIENT",
        }),
      ).rejects.toMatchObject({ code: "UNAUTHORIZED_PAYMENT" });
    });
  });

  /* ================================================================
   * REFUND
   * ================================================================ */

  describe("refundBookingPayment", () => {
    async function setupPaidBooking() {
      const { client, booking } = await setupConfirmedBooking();
      const result = await service.initiateBookingPayment(
        booking.id,
        { provider: "MOCK" },
        { userId: client.userId, role: "CLIENT" },
      );

      // Forcer PAID via webhook
      await prisma.payment.update({
        where: { id: result.payment.id },
        data: { status: "PAID", paidAt: new Date() },
      });

      return { client, booking, payment: result.payment };
    }

    it("rembourse un paiement PAID", async () => {
      const { client, booking } = await setupPaidBooking();

      const result = await service.refundBookingPayment(
        booking.id,
        {},
        { userId: client.userId, role: "CLIENT" },
      );

      expect(result.payment.status).toBe("REFUNDED");
      expect(result.payment.refundedAt).not.toBeNull();
    });

    it("refuse si le paiement n'est pas PAID", async () => {
      const { client, booking } = await setupConfirmedBooking();
      await service.initiateBookingPayment(
        booking.id,
        { provider: "MOCK" },
        { userId: client.userId, role: "CLIENT" },
      );

      await expect(
        service.refundBookingPayment(
          booking.id,
          {},
          { userId: client.userId, role: "CLIENT" },
        ),
      ).rejects.toMatchObject({ code: "REFUND_NOT_ALLOWED" });
    });

    it("refuse si non-propriétaire", async () => {
      const { booking } = await setupPaidBooking();
      const other = await seedTenant(prisma);

      await expect(
        service.refundBookingPayment(
          booking.id,
          {},
          { userId: other.userId, role: "CLIENT" },
        ),
      ).rejects.toMatchObject({ code: "UNAUTHORIZED_PAYMENT" });
    });
  });
});