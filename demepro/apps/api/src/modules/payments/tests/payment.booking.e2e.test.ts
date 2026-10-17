// apps/api/src/modules/payments/tests/payment.booking.e2e.test.ts

import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import type { Express } from "express";
import request from "supertest";

import { PrismaClient } from "../../../generated/prisma/client";
import { startPostgres, stopPostgres } from "../../../../tests/setup/postgres";
import { seedTenant, truncateAll } from "../../../../tests/helpers/factories";
import { createTestApp } from "../../../../tests/setup/test-app";
import { asUser } from "../../../../tests/helpers/auth";

describe("Payment Booking HTTP (E2E)", () => {
  let prisma: PrismaClient;
  let app: Express;

  beforeAll(async () => {
    const ctx = await startPostgres();
    prisma = ctx.prisma;
    app = createTestApp();
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

  async function setupBooking() {
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
   * POST /bookings/:id/payment
   * ================================================================ */

  describe("POST /bookings/:id/payment", () => {
    it("initie un paiement et retourne 201", async () => {
      const { client, booking } = await setupBooking();
      const api = asUser(app, client.userId, {
        role: "CLIENT",
        permissions: ["booking.payment.initiate"],
      });

      const res = await api
        .post(`/api/v1/bookings/${booking.id}/payment`)
        .send({ provider: "MOCK" });

      expect(res.status).toBe(201);
      expect(res.body.data.payment).toBeDefined();
      expect(res.body.data.payment.status).toBe("PROCESSING");
    });

    it("retourne 401 sans auth", async () => {
      const { booking } = await setupBooking();

      const res = await request(app)
        .post(`/api/v1/bookings/${booking.id}/payment`)
        .send({ provider: "MOCK" });

      expect(res.status).toBe(401);
    });

    it("retourne 403 si l'utilisateur est un PROFESSIONAL (pas un CLIENT)", async () => {
  const { booking } = await setupBooking();
  const pro = await seedTenant(prisma);
  const api = asUser(app, pro.userId, { role: "PROFESSIONAL" });

  const res = await api
    .post(`/api/v1/bookings/${booking.id}/payment`)
    .send({ provider: "MOCK" });

  expect(res.status).toBe(403);
});
  });

  /* ================================================================
   * GET /bookings/:id/payment
   * ================================================================ */

  describe("GET /bookings/:id/payment", () => {
    it("retourne le paiement au client", async () => {
      const { client, booking } = await setupBooking();
      const api = asUser(app, client.userId, {
        role: "CLIENT",
        permissions: ["booking.payment.initiate"],
      });

      await api
        .post(`/api/v1/bookings/${booking.id}/payment`)
        .send({ provider: "MOCK" });

      const res = await api.get(`/api/v1/bookings/${booking.id}/payment`);

      expect(res.status).toBe(200);
      expect(res.body.data.bookingId).toBe(booking.id);
    });
  });

  /* ================================================================
   * POST /bookings/:id/payment/refund
   * ================================================================ */

  describe("POST /bookings/:id/payment/refund", () => {
    it("rembourse un paiement PAID", async () => {
      const { client, booking } = await setupBooking();
      const api = asUser(app, client.userId, {
        role: "CLIENT",
        permissions: ["booking.payment.initiate", "booking.payment.refund"],
      });

      const init = await api
        .post(`/api/v1/bookings/${booking.id}/payment`)
        .send({ provider: "MOCK" });

      // Forcer PAID
      await prisma.payment.update({
        where: { id: init.body.data.payment.id },
        data: { status: "PAID", paidAt: new Date() },
      });

      const res = await api
        .post(`/api/v1/bookings/${booking.id}/payment/refund`)
        .send({ reason: "Annulation" });

      expect(res.status).toBe(200);
      expect(res.body.data.payment.status).toBe("REFUNDED");
    });
  });
});