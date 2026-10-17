// apps/api/src/modules/quotes/tests/quote.service.integration.test.ts

import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";

import { PrismaClient } from "../../../generated/prisma/client";
import { startPostgres, stopPostgres } from "../../../../tests/setup/postgres";
import { seedTenant, truncateAll } from "../../../../tests/helpers/factories";

import { QuoteService } from "../services/quote.service";
import { QuoteRepository } from "../repositories/quote.repository";

describe("QuoteService (integration)", () => {
  let prisma: PrismaClient;
  let service: QuoteService;

  beforeAll(async () => {
    const ctx = await startPostgres();
    prisma = ctx.prisma;

    const quoteRepo = new QuoteRepository(prisma);
    service = new QuoteService(prisma, quoteRepo);
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

  async function setupActiveService() {
    const pro = await seedTenant(prisma);
    const client = await seedTenant(prisma);

    const service_ = await prisma.service.create({
      data: {
        professionalId: pro.professionalId,
        categoryId: pro.categoryId,
        name: "Réparation fuite",
        slug: `svc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        pricingModel: "QUOTE",
        status: "ACTIVE",
      },
    });

    return { pro, client, service: service_ };
  }

  const futureISO = () => new Date(Date.now() + 7 * 864e5).toISOString();

  /* ================================================================
   * CREATE
   * ================================================================ */

  describe("createQuote", () => {
    it("crée un devis PENDING", async () => {
      const { client, service: svc } = await setupActiveService();

      const quote = await service.createQuote(
        { serviceId: svc.id, description: "Fuite sous évier à réparer" },
        { userId: client.userId },
      );

      expect(quote.id).toBeDefined();
      expect(quote.status).toBe("PENDING");
      expect(quote.userId).toBe(client.userId);
      expect(quote.serviceId).toBe(svc.id);
    });

    it("refuse un service inactif", async () => {
      const { client, service: svc } = await setupActiveService();
      await prisma.service.update({
        where: { id: svc.id },
        data: { status: "DRAFT" },
      });

      await expect(
        service.createQuote(
          { serviceId: svc.id, description: "Fuite sous évier" },
          { userId: client.userId },
        ),
      ).rejects.toMatchObject({ code: "SERVICE_NOT_ACTIVE" });
    });

    it("refuse un service inexistant", async () => {
      const { client } = await setupActiveService();

      await expect(
        service.createQuote(
          {
            serviceId: "00000000-0000-0000-0000-000000000000",
            description: "Fuite sous évier",
          },
          { userId: client.userId },
        ),
      ).rejects.toMatchObject({ code: "SERVICE_NOT_FOUND" });
    });

    it("refuse au pro de demander un devis sur son propre service", async () => {
      const { pro, service: svc } = await setupActiveService();

      await expect(
        service.createQuote(
          { serviceId: svc.id, description: "Fuite sous évier" },
          { userId: pro.userId },
        ),
      ).rejects.toMatchObject({ code: "UNAUTHORIZED_QUOTE" });
    });
  });

  /* ================================================================
   * RESPOND
   * ================================================================ */

  describe("respondToQuote", () => {
    it("le pro répond avec un prix", async () => {
      const { pro, client, service: svc } = await setupActiveService();

      const quote = await service.createQuote(
        { serviceId: svc.id, description: "Fuite sous évier à réparer" },
        { userId: client.userId },
      );

      const result = await service.respondToQuote(
        quote.id,
        { proposedPrice: 25000, message: "OK pour 25k", validityDays: 7 },
        { userId: pro.userId, role: "PROFESSIONAL" },
      );

      expect(result.quote.status).toBe("RESPONDED");
      expect(result.response.proposedPrice.toString()).toBe("25000");
    });

    it("refuse si non-propriétaire du service", async () => {
      const { client, service: svc } = await setupActiveService();
      const other = await seedTenant(prisma);

      const quote = await service.createQuote(
        { serviceId: svc.id, description: "Fuite sous évier" },
        { userId: client.userId },
      );

      await expect(
        service.respondToQuote(
          quote.id,
          { proposedPrice: 25000, validityDays: 7 },
          { userId: other.userId, role: "PROFESSIONAL" },
        ),
      ).rejects.toMatchObject({ code: "UNAUTHORIZED_QUOTE" });
    });

    it("refuse une double réponse", async () => {
      const { pro, client, service: svc } = await setupActiveService();

      const quote = await service.createQuote(
        { serviceId: svc.id, description: "Fuite sous évier" },
        { userId: client.userId },
      );

      await service.respondToQuote(
        quote.id,
        { proposedPrice: 25000, validityDays: 7 },
        { userId: pro.userId, role: "PROFESSIONAL" },
      );

      await expect(
        service.respondToQuote(
          quote.id,
          { proposedPrice: 30000, validityDays: 7 },
          { userId: pro.userId, role: "PROFESSIONAL" },
        ),
      ).rejects.toMatchObject({ code: "QUOTE_INVALID_STATE" });
    });

    it("refuse sur un devis expiré", async () => {
      const { pro, client, service: svc } = await setupActiveService();

      const quote = await service.createQuote(
        { serviceId: svc.id, description: "Fuite sous évier" },
        { userId: client.userId },
      );

      await prisma.quote.update({
        where: { id: quote.id },
        data: { expiresAt: new Date(Date.now() - 1000) },
      });

      await expect(
        service.respondToQuote(
          quote.id,
          { proposedPrice: 25000, validityDays: 7 },
          { userId: pro.userId, role: "PROFESSIONAL" },
        ),
      ).rejects.toMatchObject({ code: "QUOTE_EXPIRED" });
    });
  });

  /* ================================================================
   * ACCEPT → BOOKING
   * ================================================================ */

  describe("acceptQuote", () => {
    it("accepte et crée un Booking", async () => {
      const { pro, client, service: svc } = await setupActiveService();

      const quote = await service.createQuote(
        { serviceId: svc.id, description: "Fuite sous évier" },
        { userId: client.userId },
      );

      await service.respondToQuote(
        quote.id,
        { proposedPrice: 25000, validityDays: 7 },
        { userId: pro.userId, role: "PROFESSIONAL" },
      );

      const result = await service.acceptQuote(
        quote.id,
        { scheduledAt: futureISO() },
        { userId: client.userId },
      );

      expect(result.quote.status).toBe("CONVERTED");
      expect(result.booking.id).toBeDefined();
      expect(result.booking.quoteId).toBe(quote.id);
      expect(result.booking.totalAmount.toString()).toBe("25000");
    });

    it("refuse d'accepter un devis PENDING", async () => {
      const { client, service: svc } = await setupActiveService();

      const quote = await service.createQuote(
        { serviceId: svc.id, description: "Fuite sous évier" },
        { userId: client.userId },
      );

      await expect(
        service.acceptQuote(
          quote.id,
          { scheduledAt: futureISO() },
          { userId: client.userId },
        ),
      ).rejects.toMatchObject({ code: "QUOTE_INVALID_STATE" });
    });

    it("refuse par un non-client", async () => {
      const { pro, client, service: svc } = await setupActiveService();
      const other = await seedTenant(prisma);

      const quote = await service.createQuote(
        { serviceId: svc.id, description: "Fuite sous évier" },
        { userId: client.userId },
      );

      await service.respondToQuote(
        quote.id,
        { proposedPrice: 25000, validityDays: 7 },
        { userId: pro.userId, role: "PROFESSIONAL" },
      );

      await expect(
        service.acceptQuote(
          quote.id,
          { scheduledAt: futureISO() },
          { userId: other.userId },
        ),
      ).rejects.toMatchObject({ code: "UNAUTHORIZED_QUOTE" });
    });

    it("refuse une date passée", async () => {
      const { pro, client, service: svc } = await setupActiveService();

      const quote = await service.createQuote(
        { serviceId: svc.id, description: "Fuite sous évier" },
        { userId: client.userId },
      );

      await service.respondToQuote(
        quote.id,
        { proposedPrice: 25000, validityDays: 7 },
        { userId: pro.userId, role: "PROFESSIONAL" },
      );

      await expect(
        service.acceptQuote(
          quote.id,
          { scheduledAt: new Date(Date.now() - 3600e3).toISOString() },
          { userId: client.userId },
        ),
      ).rejects.toMatchObject({ code: "INVALID_QUOTE_DATE" });
    });
  });

  /* ================================================================
   * REJECT
   * ================================================================ */

  describe("rejectQuote", () => {
    it("rejette un devis PENDING", async () => {
      const { client, service: svc } = await setupActiveService();

      const quote = await service.createQuote(
        { serviceId: svc.id, description: "Fuite sous évier" },
        { userId: client.userId },
      );

      const rejected = await service.rejectQuote(
        quote.id,
        {},
        { userId: client.userId },
      );

      expect(rejected.status).toBe("REJECTED");
    });

    it("refuse par un non-client", async () => {
      const { client, service: svc } = await setupActiveService();
      const other = await seedTenant(prisma);

      const quote = await service.createQuote(
        { serviceId: svc.id, description: "Fuite sous évier" },
        { userId: client.userId },
      );

      await expect(
        service.rejectQuote(
          quote.id,
          {},
          { userId: other.userId },
        ),
      ).rejects.toMatchObject({ code: "UNAUTHORIZED_QUOTE" });
    });
  });

  /* ================================================================
   * EXPIRE
   * ================================================================ */

  describe("expireOverdueQuotes", () => {
    it("expire les devis PENDING overdue", async () => {
      const { client, service: svc } = await setupActiveService();

      const quote = await service.createQuote(
        { serviceId: svc.id, description: "Fuite sous évier" },
        { userId: client.userId },
      );

      await prisma.quote.update({
        where: { id: quote.id },
        data: { expiresAt: new Date(Date.now() - 1000) },
      });

      const { count } = await service.expireOverdueQuotes();
      expect(count).toBe(1);

      const refreshed = await prisma.quote.findUnique({
        where: { id: quote.id },
      });
      expect(refreshed!.status).toBe("EXPIRED");
    });

    it("expire les devis RESPONDED dont la réponse est expirée", async () => {
      const { pro, client, service: svc } = await setupActiveService();

      const quote = await service.createQuote(
        { serviceId: svc.id, description: "Fuite sous évier" },
        { userId: client.userId },
      );

      await service.respondToQuote(
        quote.id,
        { proposedPrice: 25000, validityDays: 7 },
        { userId: pro.userId, role: "PROFESSIONAL" },
      );

      await prisma.quoteResponse.update({
        where: { quoteId: quote.id },
        data: { expiresAt: new Date(Date.now() - 1000) },
      });

      const { count } = await service.expireOverdueQuotes();
      expect(count).toBe(1);
    });
  });

  /* ================================================================
   * LIST
   * ================================================================ */

  describe("listMyQuotes", () => {
    it("pagine correctement avec curseur", async () => {
      const { client, service: svc } = await setupActiveService();

      for (let i = 0; i < 3; i++) {
        await service.createQuote(
          { serviceId: svc.id, description: `Description numéro ${i}` },
          { userId: client.userId },
        );
      }

      const page = await service.listMyQuotes(
        { userId: client.userId },
        { limit: 2 },
      );

      expect(page.data).toHaveLength(2);
      expect(page.hasMore).toBe(true);
      expect(page.nextCursor).toBeTruthy();
    });

    it("filtre par statut", async () => {
      const { client, service: svc } = await setupActiveService();

      const q1 = await service.createQuote(
        { serviceId: svc.id, description: "Devis 1 à rejeter" },
        { userId: client.userId },
      );
      await service.createQuote(
        { serviceId: svc.id, description: "Devis 2 à garder" },
        { userId: client.userId },
      );
      await service.rejectQuote(q1.id, {}, { userId: client.userId });

      const page = await service.listMyQuotes(
        { userId: client.userId },
        { status: "REJECTED", limit: 10 },
      );

      expect(page.data).toHaveLength(1);
      expect(page.data[0].id).toBe(q1.id);
    });
  });

  describe("listProfessionalQuotes", () => {
    it("liste les devis reçus par le pro", async () => {
      const { pro, client, service: svc } = await setupActiveService();

      await service.createQuote(
        { serviceId: svc.id, description: "Devis client" },
        { userId: client.userId },
      );

      const page = await service.listProfessionalQuotes(
        { userId: pro.userId, role: "PROFESSIONAL" },
        { limit: 10 },
      );

      expect(page.data).toHaveLength(1);
      expect(page.data[0].serviceId).toBe(svc.id);
    });
  });

  /* ================================================================
   * GET BY ID
   * ================================================================ */

  describe("getQuote", () => {
    it("retourne un devis au client propriétaire", async () => {
      const { client, service: svc } = await setupActiveService();

      const quote = await service.createQuote(
        { serviceId: svc.id, description: "Fuite sous évier" },
        { userId: client.userId },
      );

      const fetched = await service.getQuote(quote.id, {
        userId: client.userId,
      });

      expect(fetched!.id).toBe(quote.id);
    });

    it("refuse à un tiers", async () => {
      const { client, service: svc } = await setupActiveService();
      const other = await seedTenant(prisma);

      const quote = await service.createQuote(
        { serviceId: svc.id, description: "Fuite sous évier" },
        { userId: client.userId },
      );

      await expect(
        service.getQuote(quote.id, { userId: other.userId }),
      ).rejects.toMatchObject({ code: "UNAUTHORIZED_QUOTE" });
    });
  });
});