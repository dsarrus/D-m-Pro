// apps/api/src/modules/notifications/tests/notification.service.integration.test.ts

import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";

import { PrismaClient } from "../../../generated/prisma/client";
import { startPostgres, stopPostgres } from "../../../../tests/setup/postgres";
import { seedTenant, truncateAll } from "../../../../tests/helpers/factories";

import { NotificationService } from "../services/notification.service";
import { NotificationTemplateService } from "../services/notification-template.service";
import { NotificationRepository } from "../repositories/notification.repository";

describe("NotificationService (integration)", () => {
  let prisma: PrismaClient;
  let service: NotificationService;

  beforeAll(async () => {
    const ctx = await startPostgres();
    prisma = ctx.prisma;

    const repository = new NotificationRepository(prisma);
    const templates = new NotificationTemplateService();
    service = new NotificationService(prisma, repository, templates);
  });

  afterAll(async () => {
    await stopPostgres();
  });

  beforeEach(async () => {
    await truncateAll(prisma);
  });

  /* ================================================================
   * LIST / READ
   * ================================================================ */

  describe("listMyNotifications / markAsRead", () => {
    it("liste les notifications d'un user", async () => {
      const tenant = await seedTenant(prisma);

      await prisma.notification.create({
        data: {
          userId: tenant.userId,
          type: "TEST",
          title: "Titre 1",
          body: "Corps 1",
        },
      });

      await prisma.notification.create({
        data: {
          userId: tenant.userId,
          type: "TEST",
          title: "Titre 2",
          body: "Corps 2",
        },
      });

      const result = await service.listMyNotifications({
        userId: tenant.userId,
      });

      expect(result.data).toHaveLength(2);
    });

    it("marque une notification comme lue", async () => {
      const tenant = await seedTenant(prisma);

      const notif = await prisma.notification.create({
        data: {
          userId: tenant.userId,
          type: "TEST",
          title: "Test",
          body: "Body",
        },
      });

      const updated = await service.markAsRead(notif.id, {
        userId: tenant.userId,
      });

      expect(updated.readAt).not.toBeNull();
    });

    it("refuse de marquer une notification d'un autre user", async () => {
      const tenantA = await seedTenant(prisma);
      const tenantB = await seedTenant(prisma);

      const notif = await prisma.notification.create({
        data: {
          userId: tenantA.userId,
          type: "TEST",
          title: "Test",
          body: "Body",
        },
      });

      await expect(
        service.markAsRead(notif.id, { userId: tenantB.userId }),
      ).rejects.toMatchObject({
        code: "UNAUTHORIZED_NOTIFICATION",
      });
    });

    it("compte les notifications non lues", async () => {
      const tenant = await seedTenant(prisma);

      await prisma.notification.create({
        data: {
          userId: tenant.userId,
          type: "TEST",
          title: "Test 1",
          body: "Body",
        },
      });

      await prisma.notification.create({
        data: {
          userId: tenant.userId,
          type: "TEST",
          title: "Test 2",
          body: "Body",
          readAt: new Date(),
        },
      });

      const count = await service.getUnreadCount({
        userId: tenant.userId,
      });

      expect(count).toBe(1);
    });

    it("marque toutes les notifications comme lues", async () => {
      const tenant = await seedTenant(prisma);

      await prisma.notification.create({
        data: {
          userId: tenant.userId,
          type: "TEST",
          title: "Test 1",
          body: "Body",
        },
      });

      await prisma.notification.create({
        data: {
          userId: tenant.userId,
          type: "TEST",
          title: "Test 2",
          body: "Body",
        },
      });

      const result = await service.markAllAsRead({
        userId: tenant.userId,
      });

      expect(result.count).toBe(2);

      const count = await service.getUnreadCount({
        userId: tenant.userId,
      });
      expect(count).toBe(0);
    });
  });

  /* ================================================================
   * ENVOI EMAIL / SMS
   * ================================================================ */

  describe("sendEmail / sendSms", () => {
    it("envoie un email via le provider mock", async () => {
      const result = await service.sendEmail({
        to: "test@test.dev",
        subject: "Test",
        html: "<p>Test</p>",
        text: "Test",
      });

      expect(result.success).toBe(true);
      expect(result.providerRef).toBeDefined();
    });

    it("envoie un SMS via le provider mock", async () => {
      const result = await service.sendSms({
        to: "+22370123456",
        body: "Test SMS",
      });

      expect(result.success).toBe(true);
      expect(result.providerRef).toBeDefined();
    });
  });
});