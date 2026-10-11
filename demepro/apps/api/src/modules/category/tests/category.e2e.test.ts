// apps/api/src/modules/category/tests/category.e2e.test.ts

import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import type { Express } from "express";

import { PrismaClient } from "../../../generated/prisma/client";
import { startPostgres, stopPostgres } from "../../../../tests/setup/postgres";
import {
  seedTenant,
  seedAdmin,
  truncateAll,
} from "../../../../tests/helpers/factories";
import { createTestApp } from "../../../../tests/setup/test-app";
import { asUser } from "../../../../tests/helpers/auth";

describe("Category HTTP (E2E)", () => {
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

  const BASE = "/api/v1/categories";

  /* ================================================================
   * HELPERS
   * ================================================================ */

  async function setupAdmin() {
    return seedAdmin(prisma);
  }

  async function setupVertical() {
    const tenant = await seedTenant(prisma);
    return tenant.verticalId;
  }

  function buildCategoryPayload(
    verticalId: string,
    overrides?: {
      name?: string;
      slug?: string;
      parentId?: string | null;
      type?: "SERVICE" | "PRODUCT" | "BOTH";
    },
  ) {
    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    return {
      verticalId,
      name: overrides?.name ?? "Mode",
      slug: overrides?.slug ?? `mode-${suffix}`,
      type: overrides?.type ?? "PRODUCT",
      status: "ACTIVE" as const,
      sortOrder: 0,
      parentId: overrides?.parentId ?? null,
    };
  }

  /* ================================================================
   * POST /categories (admin)
   * ================================================================ */

  describe("POST /categories", () => {
    it("crée une catégorie racine (admin)", async () => {
      const admin = await setupAdmin();
      const verticalId = await setupVertical();
      const api = asUser(app, admin.userId, { role: "ADMIN" });

      const res = await api
        .post(BASE)
        .send(buildCategoryPayload(verticalId, { slug: "mode-e2e" }));

      expect(res.status).toBe(201);
      expect(res.body.data.slug).toBe("mode-e2e");
      expect(res.body.data.parentId).toBeNull();
    });

    it("retourne 400 si validation Zod échoue", async () => {
      const admin = await setupAdmin();
      const api = asUser(app, admin.userId, { role: "ADMIN" });

      const res = await api.post(BASE).send({
        verticalId: "not-a-uuid",
        name: "X",
        slug: "Invalid Slug!",
      });

      expect(res.status).toBe(400);
    });

    it("retourne 401 sans authentification", async () => {
      const verticalId = await setupVertical();

      const res = await require("supertest")(app)
        .post(BASE)
        .send(buildCategoryPayload(verticalId));

      expect(res.status).toBe(401);
    });

    it("retourne 403 si non-admin", async () => {
      const tenant = await seedTenant(prisma);
      const api = asUser(app, tenant.userId, { role: "PROFESSIONAL" });

      const res = await api
        .post(BASE)
        .send(buildCategoryPayload(tenant.verticalId));

      expect(res.status).toBe(403);
    });

    it("retourne 404 si vertical introuvable", async () => {
      const admin = await setupAdmin();
      const api = asUser(app, admin.userId, { role: "ADMIN" });

      const res = await api.post(BASE).send({
        verticalId: "00000000-0000-0000-0000-000000000000",
        name: "Mode",
        slug: "mode-404",
        type: "PRODUCT",
        status: "ACTIVE",
        sortOrder: 0,
      });

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe("VERTICAL_NOT_FOUND");
    });

    it("retourne 409 si slug dupliqué dans le même vertical", async () => {
      const admin = await setupAdmin();
      const verticalId = await setupVertical();
      const api = asUser(app, admin.userId, { role: "ADMIN" });

      await api
        .post(BASE)
        .send(buildCategoryPayload(verticalId, { slug: "unique" }));

      const res = await api
        .post(BASE)
        .send(buildCategoryPayload(verticalId, { slug: "unique" }));

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe("CATEGORY_SLUG_TAKEN");
    });

    it("retourne 422 si profondeur > 3", async () => {
      const admin = await setupAdmin();
      const verticalId = await setupVertical();
      const api = asUser(app, admin.userId, { role: "ADMIN" });

      /* L1 */
      const l1 = await api
        .post(BASE)
        .send(buildCategoryPayload(verticalId, { slug: "l1" }));

      /* L2 */
      const l2 = await api.post(BASE).send(
        buildCategoryPayload(verticalId, {
          slug: "l2",
          parentId: l1.body.data.id,
          type: "BOTH",
        }),
      );

      /* L3 */
      const l3 = await api.post(BASE).send(
        buildCategoryPayload(verticalId, {
          slug: "l3",
          parentId: l2.body.data.id,
          type: "BOTH",
        }),
      );

      /* L4 → refusé */
      const res = await api.post(BASE).send(
        buildCategoryPayload(verticalId, {
          slug: "l4",
          parentId: l3.body.data.id,
          type: "BOTH",
        }),
      );

      expect(res.status).toBe(422);
      expect(res.body.error.code).toBe("CATEGORY_MAX_DEPTH");
    });

    it("retourne 422 si type incompatible parent/enfant", async () => {
      const admin = await setupAdmin();
      const verticalId = await setupVertical();
      const api = asUser(app, admin.userId, { role: "ADMIN" });

      /* Parent SERVICE */
      const parent = await api.post(BASE).send(
        buildCategoryPayload(verticalId, {
          slug: "svc-parent",
          type: "SERVICE",
        }),
      );

      /* Enfant PRODUCT → refusé */
      const res = await api.post(BASE).send(
        buildCategoryPayload(verticalId, {
          slug: "prd-child",
          parentId: parent.body.data.id,
          type: "PRODUCT",
        }),
      );

      expect(res.status).toBe(422);
      expect(res.body.error.code).toBe("CATEGORY_TYPE_MISMATCH");
    });
  });

  /* ================================================================
   * GET /categories
   * ================================================================ */

  describe("GET /categories (public)", () => {
    it("retourne la liste paginée", async () => {
      const admin = await setupAdmin();
      const verticalId = await setupVertical();
      const api = asUser(app, admin.userId, { role: "ADMIN" });

      await api
        .post(BASE)
        .send(buildCategoryPayload(verticalId, { slug: "cat-a" }));

      await api
        .post(BASE)
        .send(buildCategoryPayload(verticalId, { slug: "cat-b" }));

      const res = await require("supertest")(app).get(BASE);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThanOrEqual(2);
      expect(res.body.pagination).toBeDefined();
    });

    it("filtre par verticalId", async () => {
      const admin = await setupAdmin();
      const verticalId = await setupVertical();
      const api = asUser(app, admin.userId, { role: "ADMIN" });

      await api
        .post(BASE)
        .send(buildCategoryPayload(verticalId, { slug: "cat-filter" }));

      const res = await require("supertest")(app).get(
        `${BASE}?verticalId=${verticalId}`,
      );

      expect(res.status).toBe(200);
      expect(res.body.data.every((c: any) => c.verticalId === verticalId)).toBe(
        true,
      );
    });
  });

  /* ================================================================
   * GET /categories/:id
   * ================================================================ */

  describe("GET /categories/:id", () => {
    it("retourne une catégorie par ID", async () => {
      const admin = await setupAdmin();
      const verticalId = await setupVertical();
      const api = asUser(app, admin.userId, { role: "ADMIN" });

      const create = await api
        .post(BASE)
        .send(buildCategoryPayload(verticalId, { slug: "cat-get" }));

      const res = await require("supertest")(app).get(
        `${BASE}/${create.body.data.id}`,
      );

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(create.body.data.id);
    });

    it("retourne 404 si introuvable", async () => {
      const res = await require("supertest")(app).get(
        `${BASE}/00000000-0000-0000-0000-000000000000`,
      );

      expect(res.status).toBe(404);
    });

    it("retourne 400 si ID invalide", async () => {
      const res = await require("supertest")(app).get(`${BASE}/not-a-uuid`);

      expect(res.status).toBe(400);
    });
  });

  /* ================================================================
   * PATCH /categories/:id (admin)
   * ================================================================ */

  describe("PATCH /categories/:id", () => {
    it("met à jour le nom", async () => {
      const admin = await setupAdmin();
      const verticalId = await setupVertical();
      const api = asUser(app, admin.userId, { role: "ADMIN" });

      const create = await api
        .post(BASE)
        .send(buildCategoryPayload(verticalId, { slug: "cat-upd" }));

      const res = await api
        .patch(`${BASE}/${create.body.data.id}`)
        .send({ name: "Nom modifié" });

      expect(res.status).toBe(200);
      expect(res.body.data.name).toBe("Nom modifié");
    });

    it("retourne 403 si non-admin", async () => {
      const tenant = await seedTenant(prisma);
      const api = asUser(app, tenant.userId, { role: "PROFESSIONAL" });

      const res = await api
        .patch(`${BASE}/00000000-0000-0000-0000-000000000000`)
        .send({ name: "Hack" });

      expect(res.status).toBe(403);
    });
  });

  /* ================================================================
   * DELETE /categories/:id (admin)
   * ================================================================ */

  describe("DELETE /categories/:id", () => {
    it("supprime une catégorie sans enfants/produits", async () => {
      const admin = await setupAdmin();
      const verticalId = await setupVertical();
      const api = asUser(app, admin.userId, { role: "ADMIN" });

      const create = await api
        .post(BASE)
        .send(buildCategoryPayload(verticalId, { slug: "cat-del" }));

      const res = await api.delete(`${BASE}/${create.body.data.id}`);

      expect(res.status).toBe(200);
    });

    it("retourne 422 si la catégorie a des enfants", async () => {
      const admin = await setupAdmin();
      const verticalId = await setupVertical();
      const api = asUser(app, admin.userId, { role: "ADMIN" });

      const parent = await api
        .post(BASE)
        .send(buildCategoryPayload(verticalId, { slug: "parent" }));

      await api.post(BASE).send(
        buildCategoryPayload(verticalId, {
          slug: "child",
          parentId: parent.body.data.id,
          type: "BOTH",
        }),
      );

      const res = await api.delete(`${BASE}/${parent.body.data.id}`);

      expect(res.status).toBe(422);
      expect(res.body.error.code).toBe("CATEGORY_HAS_CHILDREN");
    });
  });

  /* ================================================================
   * GET /categories/vertical/:verticalId/tree
   * ================================================================ */

  describe("GET /categories/vertical/:verticalId/tree", () => {
    it("retourne l'arbre complet", async () => {
      const admin = await setupAdmin();
      const verticalId = await setupVertical();
      const api = asUser(app, admin.userId, { role: "ADMIN" });

      /* Nettoyer la catégorie par défaut */
      await prisma.category.deleteMany({ where: { verticalId } });

      const l1 = await api
        .post(BASE)
        .send(buildCategoryPayload(verticalId, { slug: "tree-l1" }));

      await api.post(BASE).send(
        buildCategoryPayload(verticalId, {
          slug: "tree-l2",
          parentId: l1.body.data.id,
          type: "BOTH",
        }),
      );

      const res = await require("supertest")(app).get(
        `${BASE}/vertical/${verticalId}/tree`,
      );

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].children).toHaveLength(1);
    });
  });
});