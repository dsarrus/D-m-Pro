// apps/api/src/modules/services/tests/service.e2e.test.ts

import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import type { Express } from "express";
import request from "supertest";

import { PrismaClient } from "../../../generated/prisma/client";
import { startPostgres, stopPostgres } from "../../../../tests/setup/postgres";
import { seedTenant, truncateAll } from "../../../../tests/helpers/factories";
import { createTestApp } from "../../../../tests/setup/test-app";
import { asUser } from "../../../../tests/helpers/auth";

describe("Service HTTP (E2E)", () => {
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

  const BASE = "/api/v1/services";

  /* ================================================================
   * HELPERS
   * ================================================================ */

  function buildServicePayload(categoryId: string, overrides?: {
    slug?: string;
    pricingModel?: "QUOTE" | "FIXED" | "HOURLY";
    basePrice?: number | null;
  }) {
    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    return {
      categoryId,
      name: "Réparation de meuble",
      slug: overrides?.slug ?? `reparation-${suffix}`,
      description: "Service de réparation sur mesure",
      pricingModel: overrides?.pricingModel ?? "QUOTE",
      basePrice: overrides?.basePrice ?? null,
      currency: "XOF",
      durationMin: 60,
      status: "DRAFT",
    };
  }

  /* ================================================================
   * POST /services
   * ================================================================ */

  describe("POST /services", () => {
    it("crée un service et retourne 201", async () => {
      const tenant = await seedTenant(prisma);
      const api = asUser(app, tenant.userId, { role: "PROFESSIONAL" });

      const res = await api
        .post(BASE)
        .send(buildServicePayload(tenant.categoryId));

      expect(res.status).toBe(201);
      expect(res.body.data.slug).toMatch(/^reparation-/);
      expect(res.body.data.pricingModel).toBe("QUOTE");
    });

    it("retourne 400 si validation Zod échoue", async () => {
      const tenant = await seedTenant(prisma);
      const api = asUser(app, tenant.userId, { role: "PROFESSIONAL" });

      const res = await api.post(BASE).send({
        categoryId: "not-a-uuid",
        name: "X",
        slug: "Invalid Slug!",
      });

      expect(res.status).toBe(400);
    });

    it("retourne 401 sans auth", async () => {
      const tenant = await seedTenant(prisma);

      const res = await request(app)
        .post(BASE)
        .send(buildServicePayload(tenant.categoryId));

      expect(res.status).toBe(401);
    });

    it("retourne 403 sans permission", async () => {
      const tenant = await seedTenant(prisma);
      const api = asUser(app, tenant.userId, {
        role: "PROFESSIONAL",
        permissions: ["catalog.product.read"],
      });

      const res = await api
        .post(BASE)
        .send(buildServicePayload(tenant.categoryId));

      expect(res.status).toBe(403);
    });

    it("retourne 422 si QUOTE avec basePrice", async () => {
      const tenant = await seedTenant(prisma);
      const api = asUser(app, tenant.userId, { role: "PROFESSIONAL" });

      const res = await api
        .post(BASE)
        .send(
          buildServicePayload(tenant.categoryId, {
            pricingModel: "QUOTE",
            basePrice: 10000,
          }),
        );

      expect(res.status).toBe(422);
    });
  });

  /* ================================================================
   * POST /services/full
   * ================================================================ */

  describe("POST /services/full", () => {
    it("crée un service complet avec images + zones + availabilities", async () => {
      const tenant = await seedTenant(prisma);
      const api = asUser(app, tenant.userId, { role: "PROFESSIONAL" });

      const res = await api.post(`${BASE}/full`).send({
        ...buildServicePayload(tenant.categoryId, {
          pricingModel: "FIXED",
          basePrice: 15000,
        }),
        images: [
          { objectKey: "img1.jpg", sortOrder: 0, isPrimary: true },
          { objectKey: "img2.jpg", sortOrder: 1, isPrimary: false },
        ],
        zones: [{ city: "Bamako" }],
        availabilities: [
          {
            dayOfWeek: 1,
            startTime: "09:00",
            endTime: "12:00",
            isRecurring: true,
          },
        ],
      });

      expect(res.status).toBe(201);
      expect(res.body.data.images).toHaveLength(2);
      expect(res.body.data.zones).toHaveLength(1);
      expect(res.body.data.availabilities).toHaveLength(1);
    });
  });

  /* ================================================================
   * GET
   * ================================================================ */

  describe("GET /services", () => {
    it("retourne la liste publique", async () => {
      const tenant = await seedTenant(prisma);
      const api = asUser(app, tenant.userId, { role: "PROFESSIONAL" });

      await api.post(BASE).send(buildServicePayload(tenant.categoryId, { slug: "svc-list-a" }));
      await api.post(BASE).send(buildServicePayload(tenant.categoryId, { slug: "svc-list-b" }));

      const res = await request(app).get(BASE);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThanOrEqual(2);
    });

    it("retourne un service par ID", async () => {
      const tenant = await seedTenant(prisma);
      const api = asUser(app, tenant.userId, { role: "PROFESSIONAL" });

      const create = await api
        .post(BASE)
        .send(buildServicePayload(tenant.categoryId));

      const res = await request(app).get(`${BASE}/${create.body.data.id}`);

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(create.body.data.id);
    });

    it("retourne 404 si introuvable", async () => {
      const res = await request(app).get(
        `${BASE}/00000000-0000-0000-0000-000000000000`,
      );
      expect(res.status).toBe(404);
    });
  });

  /* ================================================================
   * GET /services/mine
   * ================================================================ */

  describe("GET /services/mine", () => {
    it("retourne les services du pro", async () => {
      const tenant = await seedTenant(prisma);
      const api = asUser(app, tenant.userId, { role: "PROFESSIONAL" });

      await api.post(BASE).send(buildServicePayload(tenant.categoryId));

      const res = await api.get(`${BASE}/mine`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
    });
  });

  /* ================================================================
   * PATCH /services/:id
   * ================================================================ */

  describe("PATCH /services/:id", () => {
    it("met à jour un service", async () => {
      const tenant = await seedTenant(prisma);
      const api = asUser(app, tenant.userId, { role: "PROFESSIONAL" });

      const create = await api
        .post(BASE)
        .send(buildServicePayload(tenant.categoryId));

      const res = await api
        .patch(`${BASE}/${create.body.data.id}`)
        .send({ name: "Nouveau nom" });

      expect(res.status).toBe(200);
      expect(res.body.data.name).toBe("Nouveau nom");
    });

    it("retourne 403 si non-propriétaire", async () => {
      const tenantA = await seedTenant(prisma);
      const tenantB = await seedTenant(prisma);

      const apiA = asUser(app, tenantA.userId, { role: "PROFESSIONAL" });
      const create = await apiA
        .post(BASE)
        .send(buildServicePayload(tenantA.categoryId));

      const apiB = asUser(app, tenantB.userId, { role: "PROFESSIONAL" });
      const res = await apiB
        .patch(`${BASE}/${create.body.data.id}`)
        .send({ name: "Hack" });

      expect(res.status).toBe(403);
    });
  });

  /* ================================================================
   * IMAGES
   * ================================================================ */

  describe("POST /services/:id/images", () => {
    it("ajoute une image", async () => {
      const tenant = await seedTenant(prisma);
      const api = asUser(app, tenant.userId, { role: "PROFESSIONAL" });

      const create = await api
        .post(BASE)
        .send(buildServicePayload(tenant.categoryId));

      const res = await api
        .post(`${BASE}/${create.body.data.id}/images`)
        .send({ objectKey: "new.jpg", isPrimary: true });

      expect(res.status).toBe(201);
      expect(res.body.data.isPrimary).toBe(true);
    });
  });

  /* ================================================================
   * ZONES
   * ================================================================ */

  describe("POST /services/:id/zones", () => {
    it("ajoute une zone", async () => {
      const tenant = await seedTenant(prisma);
      const api = asUser(app, tenant.userId, { role: "PROFESSIONAL" });

      const create = await api
        .post(BASE)
        .send(buildServicePayload(tenant.categoryId));

      const res = await api
        .post(`${BASE}/${create.body.data.id}/zones`)
        .send({ city: "Bamako" });

      expect(res.status).toBe(201);
      expect(res.body.data.city).toBe("Bamako");
    });
  });

  /* ================================================================
   * AVAILABILITIES
   * ================================================================ */

  describe("POST /services/:id/availabilities", () => {
    it("ajoute une disponibilité", async () => {
      const tenant = await seedTenant(prisma);
      const api = asUser(app, tenant.userId, { role: "PROFESSIONAL" });

      const create = await api
        .post(BASE)
        .send(buildServicePayload(tenant.categoryId));

      const res = await api
        .post(`${BASE}/${create.body.data.id}/availabilities`)
        .send({
          dayOfWeek: 1,
          startTime: "09:00",
          endTime: "12:00",
          isRecurring: true,
        });

      expect(res.status).toBe(201);
      expect(res.body.data.dayOfWeek).toBe(1);
    });

    it("retourne 422 si créneau invalide", async () => {
      const tenant = await seedTenant(prisma);
      const api = asUser(app, tenant.userId, { role: "PROFESSIONAL" });

      const create = await api
        .post(BASE)
        .send(buildServicePayload(tenant.categoryId));

      const res = await api
        .post(`${BASE}/${create.body.data.id}/availabilities`)
        .send({
          dayOfWeek: 1,
          startTime: "14:00",
          endTime: "09:00",
          isRecurring: true,
        });

      expect(res.status).toBe(422);
    });
  });

  /* ================================================================
   * ACTIONS
   * ================================================================ */

  describe("POST /services/:id/activate + DELETE /services/:id", () => {
    it("active puis archive un service", async () => {
      const tenant = await seedTenant(prisma);
      const api = asUser(app, tenant.userId, { role: "PROFESSIONAL" });

      const create = await api
        .post(BASE)
        .send(buildServicePayload(tenant.categoryId));

      const activate = await api.post(
        `${BASE}/${create.body.data.id}/activate`,
      );
      expect(activate.status).toBe(200);
      expect(activate.body.data.status).toBe("ACTIVE");

      const archive = await api.delete(`${BASE}/${create.body.data.id}`);
      expect(archive.status).toBe(200);
      expect(archive.body.data.status).toBe("ARCHIVED");
    });
  });
});