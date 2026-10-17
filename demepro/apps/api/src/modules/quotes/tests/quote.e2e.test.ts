// apps/api/src/modules/quotes/tests/quote.e2e.test.ts

import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import type { Express } from "express";
import request from "supertest";

import { PrismaClient } from "../../../generated/prisma/client";
import { startPostgres, stopPostgres } from "../../../../tests/setup/postgres";
import { seedTenant, truncateAll } from "../../../../tests/helpers/factories";
import { createTestApp } from "../../../../tests/setup/test-app";
import { asUser } from "../../../../tests/helpers/auth";

describe("Quote HTTP (E2E)", () => {
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

  const BASE = "/api/v1/quotes";
  const futureISO = () => new Date(Date.now() + 7 * 864e5).toISOString();

  /* ================================================================
   * HELPERS
   * ================================================================ */

  async function setupActiveService() {
    const pro = await seedTenant(prisma);
    const client = await seedTenant(prisma);

    const svc = await prisma.service.create({
      data: {
        professionalId: pro.professionalId,
        categoryId: pro.categoryId,
        name: "Réparation fuite",
        slug: `svc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        pricingModel: "QUOTE",
        status: "ACTIVE",
      },
    });

    return { pro, client, service: svc };
  }

  /* ================================================================
   * POST /quotes
   * ================================================================ */

  describe("POST /quotes", () => {
    it("crée un devis et retourne 201", async () => {
      const { client, service: svc } = await setupActiveService();
      const api = asUser(app, client.userId, { role: "CLIENT" });

      const res = await api.post(BASE).send({
        serviceId: svc.id,
        description: "Fuite sous évier à réparer",
      });

      expect(res.status).toBe(201);
      expect(res.body.data.status).toBe("PENDING");
    });

    it("retourne 400 si description trop courte", async () => {
      const { client, service: svc } = await setupActiveService();
      const api = asUser(app, client.userId, { role: "CLIENT" });

      const res = await api.post(BASE).send({
        serviceId: svc.id,
        description: "Court",
      });

      expect(res.status).toBe(400);
    });

    it("retourne 401 sans auth", async () => {
      const { service: svc } = await setupActiveService();

      const res = await request(app).post(BASE).send({
        serviceId: svc.id,
        description: "Fuite sous évier à réparer",
      });

      expect(res.status).toBe(401);
    });
  });

  /* ================================================================
   * POST /quotes/:id/respond
   * ================================================================ */

  describe("POST /quotes/:id/respond", () => {
    it("le professionnel répond et retourne 200", async () => {
      const { pro, client, service: svc } = await setupActiveService();

      const apiClient = asUser(app, client.userId, { role: "CLIENT" });
      const create = await apiClient.post(BASE).send({
        serviceId: svc.id,
        description: "Fuite sous évier à réparer",
      });

      const apiPro = asUser(app, pro.userId, { role: "PROFESSIONAL" });
      const res = await apiPro
        .post(`${BASE}/${create.body.data.id}/respond`)
        .send({ proposedPrice: 30000, message: "OK pour 30k", validityDays: 7 });

      expect(res.status).toBe(200);
      expect(res.body.data.quote.status).toBe("RESPONDED");
    });

    it("retourne 403 si le client tente de répondre", async () => {
      const { client, service: svc } = await setupActiveService();

      const apiClient = asUser(app, client.userId, { role: "CLIENT" });
      const create = await apiClient.post(BASE).send({
        serviceId: svc.id,
        description: "Fuite sous évier à réparer",
      });

      const res = await apiClient
        .post(`${BASE}/${create.body.data.id}/respond`)
        .send({ proposedPrice: 30000, validityDays: 7 });

      expect(res.status).toBe(403);
    });
  });

  /* ================================================================
   * CYCLE COMPLET accept → Booking
   * ================================================================ */

  describe("Cycle complet accept → Booking", () => {
    it("accepte puis crée un Booking", async () => {
      const { pro, client, service: svc } = await setupActiveService();

      const apiClient = asUser(app, client.userId, { role: "CLIENT" });
      const create = await apiClient.post(BASE).send({
        serviceId: svc.id,
        description: "Fuite sous évier à réparer",
      });
      const id = create.body.data.id;

      const apiPro = asUser(app, pro.userId, { role: "PROFESSIONAL" });
      await apiPro
        .post(`${BASE}/${id}/respond`)
        .send({ proposedPrice: 20000, validityDays: 7 })
        .expect(200);

      const res = await apiClient
        .post(`${BASE}/${id}/accept`)
        .send({ scheduledAt: futureISO() })
        .expect(200);

      expect(res.body.data.quote.status).toBe("CONVERTED");
      expect(res.body.data.booking).toBeTruthy();
      expect(res.body.data.booking.quoteId).toBe(id);
    });
  });

  /* ================================================================
   * GET /quotes/mine
   * ================================================================ */

  describe("GET /quotes/mine", () => {
    it("liste les devis du client", async () => {
      const { client, service: svc } = await setupActiveService();
      const api = asUser(app, client.userId, { role: "CLIENT" });

      await api.post(BASE).send({
        serviceId: svc.id,
        description: "Fuite sous évier à réparer",
      });

      const res = await api.get(`${BASE}/mine`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data).toHaveLength(1);
    });
  });

  /* ================================================================
   * GET /quotes/:id
   * ================================================================ */

  describe("GET /quotes/:id", () => {
    it("retourne le devis au client", async () => {
      const { client, service: svc } = await setupActiveService();
      const api = asUser(app, client.userId, { role: "CLIENT" });

      const create = await api.post(BASE).send({
        serviceId: svc.id,
        description: "Fuite sous évier à réparer",
      });

      const res = await api.get(`${BASE}/${create.body.data.id}`);

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(create.body.data.id);
    });

    it("retourne 403 à un tiers", async () => {
      const { client, service: svc } = await setupActiveService();
      const other = await seedTenant(prisma);

      const apiClient = asUser(app, client.userId, { role: "CLIENT" });
      const create = await apiClient.post(BASE).send({
        serviceId: svc.id,
        description: "Fuite sous évier à réparer",
      });

      const apiOther = asUser(app, other.userId, { role: "CLIENT" });
      const res = await apiOther.get(`${BASE}/${create.body.data.id}`);

      expect(res.status).toBe(403);
    });
  });

  /* ================================================================
   * POST /quotes/:id/reject
   * ================================================================ */

  describe("POST /quotes/:id/reject", () => {
    it("rejette un devis et retourne 200", async () => {
      const { client, service: svc } = await setupActiveService();
      const api = asUser(app, client.userId, { role: "CLIENT" });

      const create = await api.post(BASE).send({
        serviceId: svc.id,
        description: "Fuite sous évier à réparer",
      });

      const res = await api
        .post(`${BASE}/${create.body.data.id}/reject`)
        .send({});

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe("REJECTED");
    });
  });

  /* ================================================================
   * GET /quotes/service/:serviceId
   * ================================================================ */

  describe("GET /quotes/service/:serviceId", () => {
    it("le pro liste les devis de son service", async () => {
      const { pro, client, service: svc } = await setupActiveService();

      const apiClient = asUser(app, client.userId, { role: "CLIENT" });
      await apiClient.post(BASE).send({
        serviceId: svc.id,
        description: "Fuite sous évier à réparer",
      });

      const apiPro = asUser(app, pro.userId, { role: "PROFESSIONAL" });
      const res = await apiPro.get(`${BASE}/service/${svc.id}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
    });
  });
});