// apps/api/src/modules/notifications/tests/notification.e2e.test.ts

import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import type { Express } from "express";

import { PrismaClient } from "../../../generated/prisma/client";
import { startPostgres, stopPostgres } from "../../../../tests/setup/postgres";
import { seedTenant, truncateAll } from "../../../../tests/helpers/factories";
import { createTestApp } from "../../../../tests/setup/test-app";
import { asUser } from "../../../../tests/helpers/auth";

describe("Notification HTTP (E2E)", () => {
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

  const BASE = "/api/v1/notifications";

  describe("GET /notifications/mine", () => {
    it("retourne les notifications du user", async () => {
      const tenant = await seedTenant(prisma);

      await prisma.notification.create({
        data: {
          userId: tenant.userId,
          type: "TEST",
          title: "Titre",
          body: "Corps",
        },
      });

      const api = asUser(app, tenant.userId, { role: "CLIENT" });
      const res = await api.get(`${BASE}/mine`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
    });

    it("retourne 401 sans auth", async () => {
      const res = await require("supertest")(app).get(`${BASE}/mine`);
      expect(res.status).toBe(401);
    });
  });

  describe("GET /notifications/unread-count", () => {
    it("retourne le nombre de notifications non lues", async () => {
      const tenant = await seedTenant(prisma);

      await prisma.notification.create({
        data: {
          userId: tenant.userId,
          type: "TEST",
          title: "Titre",
          body: "Corps",
        },
      });

      const api = asUser(app, tenant.userId, { role: "CLIENT" });
      const res = await api.get(`${BASE}/unread-count`);

      expect(res.status).toBe(200);
      expect(res.body.data.count).toBe(1);
    });
  });

  describe("POST /notifications/:id/read", () => {
    it("marque une notification comme lue", async () => {
      const tenant = await seedTenant(prisma);

      const notif = await prisma.notification.create({
        data: {
          userId: tenant.userId,
          type: "TEST",
          title: "Titre",
          body: "Corps",
        },
      });

      const api = asUser(app, tenant.userId, { role: "CLIENT" });
      const res = await api.post(`${BASE}/${notif.id}/read`);

      expect(res.status).toBe(200);
      expect(res.body.data.readAt).toBeDefined();
    });
  });

  describe("POST /notifications/read-all", () => {
    it("marque toutes les notifications comme lues", async () => {
      const tenant = await seedTenant(prisma);

      await prisma.notification.create({
        data: {
          userId: tenant.userId,
          type: "TEST",
          title: "Titre 1",
          body: "Corps",
        },
      });

      await prisma.notification.create({
        data: {
          userId: tenant.userId,
          type: "TEST",
          title: "Titre 2",
          body: "Corps",
        },
      });

      const api = asUser(app, tenant.userId, { role: "CLIENT" });
      const res = await api.post(`${BASE}/read-all`);

      expect(res.status).toBe(200);
      expect(res.body.data.count).toBe(2);
    });
  });
});