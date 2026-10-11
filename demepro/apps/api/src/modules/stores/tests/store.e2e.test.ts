// apps/api/src/modules/stores/tests/store.e2e.test.ts

import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import type { Express } from "express";

import { PrismaClient } from "../../../generated/prisma/client";
import { startPostgres, stopPostgres } from "../../../../tests/setup/postgres";
import {
  seedProfessionalWithoutStore,
  seedAdmin,
  truncateAll,
} from "../../../../tests/helpers/factories";
import { createTestApp } from "../../../../tests/setup/test-app";
import { asUser } from "../../../../tests/helpers/auth";

describe("Store HTTP (E2E)", () => {
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

  const BASE = "/api/v1/stores";

  /* ================================================================
   * HELPERS
   * ================================================================ */

  async function setupProfessional() {
    return seedProfessionalWithoutStore(prisma);
  }

  function buildStorePayload(overrides?: { name?: string; slug?: string }) {
    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    return {
      name: overrides?.name ?? "Ma boutique",
      slug: overrides?.slug ?? `ma-boutique-${suffix}`,
      description: "Description test",
    };
  }

  /* ================================================================
   * POST /stores — Création
   * ================================================================ */

  describe("POST /stores", () => {
    it("crée une boutique et retourne 201", async () => {
      const tenant = await setupProfessional();
      const api = asUser(app, tenant.userId, { role: "PROFESSIONAL" });

      const res = await api.post(BASE).send(buildStorePayload());

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.slug).toMatch(/^ma-boutique-/);
      expect(res.body.data.status).toBe("DRAFT");
    });

    it("retourne 400 si validation Zod échoue (slug invalide)", async () => {
      const tenant = await setupProfessional();
      const api = asUser(app, tenant.userId, { role: "PROFESSIONAL" });

      const res = await api.post(BASE).send({
        name: "X", // trop court
        slug: "Invalid Slug!",
      });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it("retourne 401 si aucun header d'auth", async () => {
      const res = await require("supertest")(app)
        .post(BASE)
        .send(buildStorePayload());

      expect(res.status).toBe(401);
    });

    it("retourne 403 si permission manquante", async () => {
      const tenant = await setupProfessional();
      const api = asUser(app, tenant.userId, {
        role: "PROFESSIONAL",
        permissions: ["catalog.product.read"], // pas store.create
      });

      const res = await api.post(BASE).send(buildStorePayload());

      expect(res.status).toBe(403);
    });

    it("retourne 409 si le slug est déjà pris", async () => {
      const tenant = await setupProfessional();
      const api = asUser(app, tenant.userId, { role: "PROFESSIONAL" });

      const payload = buildStorePayload({ slug: "slug-commun" });

      await api.post(BASE).send(payload);

      /* Nouveau pro essaie le même slug */
      const tenant2 = await setupProfessional();
      const api2 = asUser(app, tenant2.userId, { role: "PROFESSIONAL" });

      const res = await api2.post(BASE).send(payload);

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe("STORE_SLUG_TAKEN");
    });

    it("retourne 409 si le pro a déjà une boutique", async () => {
      const tenant = await setupProfessional();
      const api = asUser(app, tenant.userId, { role: "PROFESSIONAL" });

      await api.post(BASE).send(buildStorePayload());

      const res = await api.post(BASE).send(buildStorePayload());

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe("STORE_ALREADY_EXISTS");
    });
  });

  /* ================================================================
   * GET /stores/me
   * ================================================================ */

  describe("GET /stores/me", () => {
    it("retourne la boutique du pro", async () => {
      const tenant = await setupProfessional();
      const api = asUser(app, tenant.userId, { role: "PROFESSIONAL" });

      await api.post(BASE).send(buildStorePayload());

      const res = await api.get(`${BASE}/me`);

      expect(res.status).toBe(200);
      expect(res.body.data.professionalId).toBe(tenant.professionalId);
    });

    it("retourne 404 si le pro n'a pas de boutique", async () => {
      const tenant = await setupProfessional();
      const api = asUser(app, tenant.userId, { role: "PROFESSIONAL" });

      const res = await api.get(`${BASE}/me`);

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe("STORE_NOT_FOUND");
    });
  });

  /* ================================================================
   * GET /stores — Liste publique
   * ================================================================ */

  describe("GET /stores (public)", () => {
    it("ne retourne que les boutiques ACTIVE", async () => {
      const tenant = await setupProfessional();
      const api = asUser(app, tenant.userId, { role: "PROFESSIONAL" });

      /* Créer une boutique (DRAFT) */
      const create = await api.post(BASE).send(buildStorePayload());

      /* Sans authentification */
      const res = await require("supertest")(app).get(BASE);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(0); // DRAFT non exposée
    });

    it("retourne une boutique ACTIVE", async () => {
      const tenant = await setupProfessional();
      const api = asUser(app, tenant.userId, { role: "PROFESSIONAL" });

      const create = await api.post(BASE).send(buildStorePayload());
      const storeId = create.body.data.id;

      await api.post(`${BASE}/${storeId}/activate`);

      const res = await require("supertest")(app).get(BASE);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
    });
  });

  /* ================================================================
   * GET /stores/slug/:slug
   * ================================================================ */

  describe("GET /stores/slug/:slug", () => {
    it("retourne une boutique ACTIVE par slug", async () => {
      const tenant = await setupProfessional();
      const api = asUser(app, tenant.userId, { role: "PROFESSIONAL" });

      const payload = buildStorePayload({ slug: "ma-boutique-pub" });
      const create = await api.post(BASE).send(payload);
      await api.post(`${BASE}/${create.body.data.id}/activate`);

      const res = await require("supertest")(app)
        .get(`${BASE}/slug/ma-boutique-pub`);

      expect(res.status).toBe(200);
      expect(res.body.data.slug).toBe("ma-boutique-pub");
    });

    it("retourne 404 si la boutique est en DRAFT", async () => {
      const tenant = await setupProfessional();
      const api = asUser(app, tenant.userId, { role: "PROFESSIONAL" });

      await api.post(BASE).send(buildStorePayload({ slug: "draft-store" }));

      const res = await require("supertest")(app)
        .get(`${BASE}/slug/draft-store`);

      expect(res.status).toBe(404);
    });
  });

  /* ================================================================
   * PATCH /stores/:id
   * ================================================================ */

  describe("PATCH /stores/:id", () => {
    it("met à jour le nom", async () => {
      const tenant = await setupProfessional();
      const api = asUser(app, tenant.userId, { role: "PROFESSIONAL" });

      const create = await api.post(BASE).send(buildStorePayload());
      const storeId = create.body.data.id;

      const res = await api
        .patch(`${BASE}/${storeId}`)
        .send({ name: "Nouveau nom" });

      expect(res.status).toBe(200);
      expect(res.body.data.name).toBe("Nouveau nom");
    });

    it("retourne 403 si non-propriétaire", async () => {
      const tenantA = await setupProfessional();
      const tenantB = await setupProfessional();

      const apiA = asUser(app, tenantA.userId, { role: "PROFESSIONAL" });
      const create = await apiA.post(BASE).send(buildStorePayload());

      const apiB = asUser(app, tenantB.userId, { role: "PROFESSIONAL" });
      const res = await apiB
        .patch(`${BASE}/${create.body.data.id}`)
        .send({ name: "Hack" });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe("UNAUTHORIZED_STORE");
    });
  });

  /* ================================================================
   * POST /stores/:id/activate
   * ================================================================ */

  describe("POST /stores/:id/activate", () => {
    it("active une boutique si le téléphone est confirmé", async () => {
      const tenant = await setupProfessional();
      const api = asUser(app, tenant.userId, { role: "PROFESSIONAL" });

      const create = await api.post(BASE).send(buildStorePayload());

      const res = await api.post(`${BASE}/${create.body.data.id}/activate`);

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe("ACTIVE");
    });

    it("retourne 403 si le téléphone n'est pas confirmé", async () => {
      const tenant = await setupProfessional();

      /* Retirer la confirmation du téléphone */
      await prisma.user.update({
        where: { id: tenant.userId },
        data: { phoneVerifiedAt: null },
      });

      const api = asUser(app, tenant.userId, { role: "PROFESSIONAL" });
      const create = await api.post(BASE).send(buildStorePayload());

      const res = await api.post(`${BASE}/${create.body.data.id}/activate`);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe("PROFESSIONAL_NOT_VERIFIED");
    });

    it("retourne 422 si déjà ACTIVE", async () => {
      const tenant = await setupProfessional();
      const api = asUser(app, tenant.userId, { role: "PROFESSIONAL" });

      const create = await api.post(BASE).send(buildStorePayload());
      const storeId = create.body.data.id;

      await api.post(`${BASE}/${storeId}/activate`);

      const res = await api.post(`${BASE}/${storeId}/activate`);

      expect(res.status).toBe(422);
      expect(res.body.error.code).toBe("INVALID_STORE_STATE");
    });
  });

  /* ================================================================
   * POST /stores/:id/suspend (admin)
   * ================================================================ */

  describe("POST /stores/:id/suspend", () => {
    it("suspend une boutique ACTIVE (admin)", async () => {
      const tenant = await setupProfessional();
      const admin = await seedAdmin(prisma);

      const apiPro = asUser(app, tenant.userId, { role: "PROFESSIONAL" });
      const create = await apiPro.post(BASE).send(buildStorePayload());
      const storeId = create.body.data.id;

      await apiPro.post(`${BASE}/${storeId}/activate`);

      const apiAdmin = asUser(app, admin.userId, { role: "ADMIN" });
      const res = await apiAdmin.post(`${BASE}/${storeId}/suspend`);

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe("SUSPENDED");
    });

    it("retourne 403 si non-admin", async () => {
      const tenant = await setupProfessional();
      const api = asUser(app, tenant.userId, { role: "PROFESSIONAL" });

      const create = await api.post(BASE).send(buildStorePayload());
      const storeId = create.body.data.id;

      await api.post(`${BASE}/${storeId}/activate`);

      const res = await api.post(`${BASE}/${storeId}/suspend`);

      expect(res.status).toBe(403);
    });
  });

  /* ================================================================
   * POST /stores/:id/close
   * ================================================================ */

  describe("POST /stores/:id/close", () => {
    it("ferme une boutique sans produits", async () => {
      const tenant = await setupProfessional();
      const api = asUser(app, tenant.userId, { role: "PROFESSIONAL" });

      const create = await api.post(BASE).send(buildStorePayload());
      const storeId = create.body.data.id;

      const res = await api.post(`${BASE}/${storeId}/close`);

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe("CLOSED");
    });

    it("retourne 422 si des produits existent", async () => {
      const tenant = await setupProfessional();
      const api = asUser(app, tenant.userId, { role: "PROFESSIONAL" });

      const create = await api.post(BASE).send(buildStorePayload());
      const storeId = create.body.data.id;

      /* Créer un produit directement en DB */
      await prisma.product.create({
        data: {
          storeId,
          categoryId: tenant.categoryId,
          name: "Produit",
          slug: "produit-x",
          hasVariants: false,
          price: 1000,
          currency: "XOF",
        },
      });

      const res = await api.post(`${BASE}/${storeId}/close`);

      expect(res.status).toBe(422);
      expect(res.body.error.code).toBe("STORE_HAS_PRODUCTS");
    });
  });
});