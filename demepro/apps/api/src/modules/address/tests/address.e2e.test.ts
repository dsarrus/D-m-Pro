// apps/api/src/modules/address/tests/address.e2e.test.ts

import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import type { Express } from "express";

import { PrismaClient } from "../../../generated/prisma/client";
import { startPostgres, stopPostgres } from "../../../../tests/setup/postgres";
import { seedTenant, truncateAll } from "../../../../tests/helpers/factories";
import { createTestApp } from "../../../../tests/setup/test-app";
import { asUser } from "../../../../tests/helpers/auth";

describe("Address HTTP (E2E)", () => {
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

  const BASE = "/api/v1/addresses";

  /* ================================================================
   * HELPERS
   * ================================================================ */

  function buildAddressPayload(overrides?: {
    label?: string;
    isDefault?: boolean;
  }) {
    return {
      label: overrides?.label ?? "Maison",
      type: "HOME" as const,
      recipientName: "Awa Traoré",
      phone: "+22370123456",
      addressLine1: "Hamdallaye ACI 2000",
      city: "Bamako",
      region: "Bamako",
      countryCode: "ML",
      isDefault: overrides?.isDefault ?? false,
    };
  }

  /* ================================================================
   * POST /addresses
   * ================================================================ */

  describe("POST /addresses", () => {
    it("crée une adresse et retourne 201", async () => {
      const tenant = await seedTenant(prisma);
      const api = asUser(app, tenant.userId, { role: "CLIENT" });

      const res = await api.post(BASE).send(buildAddressPayload());

      expect(res.status).toBe(201);
      expect(res.body.data.label).toBe("Maison");
      expect(res.body.data.isDefault).toBe(true);
    });

    it("retourne 400 si validation Zod échoue", async () => {
      const tenant = await seedTenant(prisma);
      const api = asUser(app, tenant.userId, { role: "CLIENT" });

      const res = await api.post(BASE).send({
        label: "",
        recipientName: "X",
      });

      expect(res.status).toBe(400);
    });

    it("retourne 401 sans auth", async () => {
      const res = await require("supertest")(app)
        .post(BASE)
        .send(buildAddressPayload());

      expect(res.status).toBe(401);
    });
  });

  /* ================================================================
   * GET /addresses/mine
   * ================================================================ */

  describe("GET /addresses/mine", () => {
    it("retourne les adresses du client", async () => {
      const tenant = await seedTenant(prisma);
      const api = asUser(app, tenant.userId, { role: "CLIENT" });

      await api.post(BASE).send(buildAddressPayload({ label: "A" }));
      await api.post(BASE).send(buildAddressPayload({ label: "B" }));

      const res = await api.get(`${BASE}/mine`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(2);
    });
  });

  /* ================================================================
   * GET /addresses/default
   * ================================================================ */

  describe("GET /addresses/default", () => {
    it("retourne l'adresse par défaut", async () => {
      const tenant = await seedTenant(prisma);
      const api = asUser(app, tenant.userId, { role: "CLIENT" });

      await api.post(BASE).send(buildAddressPayload());

      const res = await api.get(`${BASE}/default`);

      expect(res.status).toBe(200);
      expect(res.body.data.isDefault).toBe(true);
    });

    it("retourne 404 si aucune adresse par défaut", async () => {
      const tenant = await seedTenant(prisma);
      const api = asUser(app, tenant.userId, { role: "CLIENT" });

      const res = await api.get(`${BASE}/default`);

      expect(res.status).toBe(404);
    });
  });

  /* ================================================================
   * PATCH /addresses/:id
   * ================================================================ */

  describe("PATCH /addresses/:id", () => {
    it("met à jour une adresse", async () => {
      const tenant = await seedTenant(prisma);
      const api = asUser(app, tenant.userId, { role: "CLIENT" });

      const create = await api.post(BASE).send(buildAddressPayload());

      const res = await api
        .patch(`${BASE}/${create.body.data.id}`)
        .send({ label: "Bureau", city: "Ségou" });

      expect(res.status).toBe(200);
      expect(res.body.data.label).toBe("Bureau");
    });

    it("retourne 403 si non-propriétaire", async () => {
      const tenantA = await seedTenant(prisma);
      const tenantB = await seedTenant(prisma);

      const apiA = asUser(app, tenantA.userId, { role: "CLIENT" });
      const create = await apiA.post(BASE).send(buildAddressPayload());

      const apiB = asUser(app, tenantB.userId, { role: "CLIENT" });
      const res = await apiB
        .patch(`${BASE}/${create.body.data.id}`)
        .send({ label: "Hack" });

      expect(res.status).toBe(403);
    });
  });

  /* ================================================================
   * POST /addresses/:id/default
   * ================================================================ */

  describe("POST /addresses/:id/default", () => {
    it("promeut une adresse par défaut", async () => {
      const tenant = await seedTenant(prisma);
      const api = asUser(app, tenant.userId, { role: "CLIENT" });

      await api.post(BASE).send(buildAddressPayload({ label: "1ère" }));
      const second = await api
        .post(BASE)
        .send(buildAddressPayload({ label: "2ᵉ" }));

      const res = await api.post(
        `${BASE}/${second.body.data.id}/default`,
      );

      expect(res.status).toBe(200);
      expect(res.body.data.isDefault).toBe(true);
    });
  });

  /* ================================================================
   * DELETE /addresses/:id
   * ================================================================ */

  describe("DELETE /addresses/:id", () => {
    it("supprime une adresse", async () => {
      const tenant = await seedTenant(prisma);
      const api = asUser(app, tenant.userId, { role: "CLIENT" });

      const create = await api.post(BASE).send(buildAddressPayload());

      const res = await api.delete(`${BASE}/${create.body.data.id}`);

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(create.body.data.id);

      const refreshed = await prisma.address.findUnique({
        where: { id: create.body.data.id },
      });
      expect(refreshed).toBeNull();
    });
  });
});