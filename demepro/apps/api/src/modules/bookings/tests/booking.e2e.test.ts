// apps/api/src/modules/bookings/tests/booking.e2e.test.ts

import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import type { Express } from "express";
import request from "supertest";

import { PrismaClient } from "../../../generated/prisma/client";
import { startPostgres, stopPostgres } from "../../../../tests/setup/postgres";
import { seedTenant, truncateAll } from "../../../../tests/helpers/factories";
import { createTestApp } from "../../../../tests/setup/test-app";
import { asUser } from "../../../../tests/helpers/auth";

describe("Booking HTTP (E2E)", () => {
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

  const BASE = "/api/v1/bookings";
  const futureISO = (offsetMs = 7 * 864e5) =>
    new Date(Date.now() + offsetMs).toISOString();

  /* ================================================================
   * HELPERS
   * ================================================================ */

  async function setupService(
    pricingModel: "FIXED" | "HOURLY" | "QUOTE" = "FIXED",
  ) {
    const pro = await seedTenant(prisma);
    const client = await seedTenant(prisma);

    const svc = await prisma.service.create({
      data: {
        professionalId: pro.professionalId,
        categoryId: pro.categoryId,
        name: "Réparation fuite",
        slug: `svc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        pricingModel,
        basePrice: pricingModel === "QUOTE" ? null : 25000,
        status: "ACTIVE",
      },
    });

    return { pro, client, service: svc };
  }

  /* ================================================================
   * POST /bookings
   * ================================================================ */

  describe("POST /bookings", () => {
    it("crée un booking et retourne 201", async () => {
      const { client, service: svc } = await setupService("FIXED");
      const api = asUser(app, client.userId, { role: "CLIENT" });

      const res = await api.post(BASE).send({
        serviceId: svc.id,
        scheduledAt: futureISO(),
        address: "Bamako, Hamdallaye",
      });

      expect(res.status).toBe(201);
      expect(res.body.data.status).toBe("CONFIRMED");
    });

    it("retourne 400 si date passée", async () => {
      const { client, service: svc } = await setupService("FIXED");
      const api = asUser(app, client.userId, { role: "CLIENT" });

      const res = await api.post(BASE).send({
        serviceId: svc.id,
        scheduledAt: new Date(Date.now() - 3600e3).toISOString(),
      });

      expect(res.status).toBe(400);
    });

    it("retourne 401 sans auth", async () => {
      const { service: svc } = await setupService("FIXED");

      const res = await request(app).post(BASE).send({
        serviceId: svc.id,
        scheduledAt: futureISO(),
      });

      expect(res.status).toBe(401);
    });
  });

  /* ================================================================
   * GET /bookings/mine
   * ================================================================ */

  describe("GET /bookings/mine", () => {
    it("liste les bookings du client", async () => {
      const { client, service: svc } = await setupService("FIXED");
      const api = asUser(app, client.userId, { role: "CLIENT" });

      await api.post(BASE).send({
        serviceId: svc.id,
        scheduledAt: futureISO(),
      });

      const res = await api.get(`${BASE}/mine`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data).toHaveLength(1);
    });
  });

  /* ================================================================
   * GET /bookings/:id
   * ================================================================ */

  describe("GET /bookings/:id", () => {
    it("retourne le booking au client", async () => {
      const { client, service: svc } = await setupService("FIXED");
      const api = asUser(app, client.userId, { role: "CLIENT" });

      const create = await api.post(BASE).send({
        serviceId: svc.id,
        scheduledAt: futureISO(),
      });

      const res = await api.get(`${BASE}/${create.body.data.id}`);

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(create.body.data.id);
    });

    it("retourne 403 à un tiers", async () => {
      const { client, service: svc } = await setupService("FIXED");
      const other = await seedTenant(prisma);

      const apiClient = asUser(app, client.userId, { role: "CLIENT" });
      const create = await apiClient.post(BASE).send({
        serviceId: svc.id,
        scheduledAt: futureISO(),
      });

      const apiOther = asUser(app, other.userId, { role: "CLIENT" });
      const res = await apiOther.get(`${BASE}/${create.body.data.id}`);

      expect(res.status).toBe(403);
    });
  });

  /* ================================================================
   * CYCLE COMPLET start → complete
   * ================================================================ */

  describe("Cycle complet start → complete", () => {
    it("démarre puis termine le booking", async () => {
      const { pro, client, service: svc } = await setupService("FIXED");

      const apiClient = asUser(app, client.userId, { role: "CLIENT" });
      const create = await apiClient.post(BASE).send({
        serviceId: svc.id,
        scheduledAt: futureISO(),
      });
      const id = create.body.data.id;

      const apiPro = asUser(app, pro.userId, { role: "PROFESSIONAL" });

      const started = await apiPro
        .post(`${BASE}/${id}/start`)
        .send({})
        .expect(200);
      expect(started.body.data.status).toBe("IN_PROGRESS");

      const completed = await apiPro
        .post(`${BASE}/${id}/complete`)
        .send({ notes: "Terminé" })
        .expect(200);
      expect(completed.body.data.status).toBe("COMPLETED");
      expect(completed.body.data.completedAt).not.toBeNull();
    });
  });

  /* ================================================================
   * POST /bookings/:id/cancel
   * ================================================================ */

  describe("POST /bookings/:id/cancel", () => {
    it("annule le booking (client)", async () => {
      const { client, service: svc } = await setupService("FIXED");
      const api = asUser(app, client.userId, { role: "CLIENT" });

      const create = await api.post(BASE).send({
        serviceId: svc.id,
        scheduledAt: futureISO(),
      });

      const res = await api
        .post(`${BASE}/${create.body.data.id}/cancel`)
        .send({ reason: "Changement de plans" });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe("CANCELLED");
      expect(res.body.data.canceledAt).not.toBeNull();
    });
  });

  /* ================================================================
   * POST /bookings/:id/no-show
   * ================================================================ */

  describe("POST /bookings/:id/no-show", () => {
    it("marque NO_SHOW sur booking passé", async () => {
      const { pro, client, service: svc } = await setupService("FIXED");

      const apiClient = asUser(app, client.userId, { role: "CLIENT" });
      const create = await apiClient.post(BASE).send({
        serviceId: svc.id,
        scheduledAt: futureISO(),
      });
      const id = create.body.data.id;

      /* Forcer scheduledAt dans le passé */
      await prisma.booking.update({
        where: { id },
        data: { scheduledAt: new Date(Date.now() - 3600e3) },
      });

      const apiPro = asUser(app, pro.userId, { role: "PROFESSIONAL" });
      const res = await apiPro.post(`${BASE}/${id}/no-show`).send({});

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe("NO_SHOW");
    });
  });

  /* ================================================================
   * GET /bookings/service/:serviceId
   * ================================================================ */

  describe("GET /bookings/service/:serviceId", () => {
    it("le pro liste les bookings de son service", async () => {
      const { pro, client, service: svc } = await setupService("FIXED");

      const apiClient = asUser(app, client.userId, { role: "CLIENT" });
      await apiClient.post(BASE).send({
        serviceId: svc.id,
        scheduledAt: futureISO(),
      });

      const apiPro = asUser(app, pro.userId, { role: "PROFESSIONAL" });
      const res = await apiPro.get(`${BASE}/service/${svc.id}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
    });
  });
});