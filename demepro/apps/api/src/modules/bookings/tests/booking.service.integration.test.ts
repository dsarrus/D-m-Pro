// apps/api/src/modules/bookings/tests/booking.service.integration.test.ts

import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";

import { PrismaClient } from "../../../generated/prisma/client";
import { startPostgres, stopPostgres } from "../../../../tests/setup/postgres";
import { seedTenant, truncateAll } from "../../../../tests/helpers/factories";

import { BookingService } from "../services/booking.service";
import { BookingRepository } from "../repositories/booking.repository";

describe("BookingService (integration)", () => {
  let prisma: PrismaClient;
  let service: BookingService;

  beforeAll(async () => {
    const ctx = await startPostgres();
    prisma = ctx.prisma;

    const bookingRepo = new BookingRepository(prisma);
    service = new BookingService(prisma, bookingRepo);
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

  async function setupService(
    pricingModel: "FIXED" | "HOURLY" | "QUOTE" = "FIXED",
    status: "ACTIVE" | "DRAFT" = "ACTIVE",
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
        status,
      },
    });

    return { pro, client, service: svc };
  }

  const futureISO = (offsetMs = 7 * 864e5) =>
    new Date(Date.now() + offsetMs).toISOString();

  /* ================================================================
   * CREATE
   * ================================================================ */

  describe("createBooking", () => {
    it("crée un booking CONFIRMED (service FIXED)", async () => {
      const { client, service: svc } = await setupService("FIXED");

      const booking = await service.createBooking(
        {
          serviceId: svc.id,
          scheduledAt: futureISO(),
          address: "Bamako, Hamdallaye",
        },
        { userId: client.userId },
      );

      expect(booking.id).toBeDefined();
      expect(booking.status).toBe("CONFIRMED");
      expect(booking.userId).toBe(client.userId);
      expect(booking.serviceId).toBe(svc.id);
      expect(booking.totalAmount.toString()).toBe("25000");
    });

    it("refuse un service inactif", async () => {
      const { client, service: svc } = await setupService("FIXED", "DRAFT");

      await expect(
        service.createBooking(
          { serviceId: svc.id, scheduledAt: futureISO() },
          { userId: client.userId },
        ),
      ).rejects.toMatchObject({ code: "SERVICE_NOT_ACTIVE" });
    });

    it("refuse un service inexistant", async () => {
      const { client } = await setupService("FIXED");

      await expect(
        service.createBooking(
          {
            serviceId: "00000000-0000-0000-0000-000000000000",
            scheduledAt: futureISO(),
          },
          { userId: client.userId },
        ),
      ).rejects.toMatchObject({ code: "SERVICE_NOT_FOUND" });
    });

    it("refuse un service QUOTE (doit passer par devis)", async () => {
      const { client, service: svc } = await setupService("QUOTE");

      await expect(
        service.createBooking(
          { serviceId: svc.id, scheduledAt: futureISO() },
          { userId: client.userId },
        ),
      ).rejects.toMatchObject({ code: "SERVICE_NOT_BOOKABLE" });
    });

    it("refuse au pro de réserver son propre service", async () => {
      const { pro, service: svc } = await setupService("FIXED");

      await expect(
        service.createBooking(
          { serviceId: svc.id, scheduledAt: futureISO() },
          { userId: pro.userId },
        ),
      ).rejects.toMatchObject({ code: "UNAUTHORIZED_BOOKING" });
    });

    it("refuse une date passée", async () => {
      const { client, service: svc } = await setupService("FIXED");

      await expect(
        service.createBooking(
          {
            serviceId: svc.id,
            scheduledAt: new Date(Date.now() - 3600e3).toISOString(),
          },
          { userId: client.userId },
        ),
      ).rejects.toMatchObject({ code: "INVALID_BOOKING_DATE" });
    });

    it("refuse un conflit de créneau", async () => {
      const { client, service: svc } = await setupService("FIXED");
      const other = await seedTenant(prisma);

      const scheduledAt = futureISO();
      await service.createBooking(
        { serviceId: svc.id, scheduledAt },
        { userId: client.userId },
      );

      await expect(
        service.createBooking(
          { serviceId: svc.id, scheduledAt },
          { userId: other.userId },
        ),
      ).rejects.toMatchObject({ code: "BOOKING_SLOT_CONFLICT" });
    });
  });

  /* ================================================================
   * START
   * ================================================================ */

  describe("startBooking", () => {
    it("passe CONFIRMED → IN_PROGRESS", async () => {
      const { pro, client, service: svc } = await setupService("FIXED");

      const booking = await service.createBooking(
        { serviceId: svc.id, scheduledAt: futureISO() },
        { userId: client.userId },
      );

      const started = await service.startBooking(booking.id, {
        userId: pro.userId,
        role: "PROFESSIONAL",
      });

      expect(started.status).toBe("IN_PROGRESS");
    });

    it("refuse au client de démarrer", async () => {
      const { client, service: svc } = await setupService("FIXED");

      const booking = await service.createBooking(
        { serviceId: svc.id, scheduledAt: futureISO() },
        { userId: client.userId },
      );

      await expect(
        service.startBooking(booking.id, {
          userId: client.userId,
          role: "CLIENT",
        }),
      ).rejects.toMatchObject({ code: "UNAUTHORIZED_SERVICE" });
    });

    it("refuse sur un booking déjà COMPLETED", async () => {
      const { pro, client, service: svc } = await setupService("FIXED");

      const booking = await service.createBooking(
        { serviceId: svc.id, scheduledAt: futureISO() },
        { userId: client.userId },
      );

      await service.startBooking(booking.id, {
        userId: pro.userId,
        role: "PROFESSIONAL",
      });
      await service.completeBooking(
        booking.id,
        {},
        { userId: pro.userId, role: "PROFESSIONAL" },
      );

      await expect(
        service.startBooking(booking.id, {
          userId: pro.userId,
          role: "PROFESSIONAL",
        }),
      ).rejects.toMatchObject({ code: "BOOKING_INVALID_STATE" });
    });
  });

  /* ================================================================
   * COMPLETE
   * ================================================================ */

  describe("completeBooking", () => {
    it("passe IN_PROGRESS → COMPLETED (+ completedAt)", async () => {
      const { pro, client, service: svc } = await setupService("FIXED");

      const booking = await service.createBooking(
        { serviceId: svc.id, scheduledAt: futureISO() },
        { userId: client.userId },
      );

      await service.startBooking(booking.id, {
        userId: pro.userId,
        role: "PROFESSIONAL",
      });

      const completed = await service.completeBooking(
        booking.id,
        { notes: "Tout s'est bien passé" },
        { userId: pro.userId, role: "PROFESSIONAL" },
      );

      expect(completed.status).toBe("COMPLETED");
      expect(completed.completedAt).not.toBeNull();
    });

    it("refuse COMPLETED depuis CONFIRMED (transition invalide)", async () => {
      const { pro, client, service: svc } = await setupService("FIXED");

      const booking = await service.createBooking(
        { serviceId: svc.id, scheduledAt: futureISO() },
        { userId: client.userId },
      );

      await expect(
        service.completeBooking(
          booking.id,
          {},
          { userId: pro.userId, role: "PROFESSIONAL" },
        ),
      ).rejects.toMatchObject({ code: "BOOKING_INVALID_STATE" });
    });
  });

  /* ================================================================
   * CANCEL
   * ================================================================ */

  describe("cancelBooking", () => {
    it("annule par le client (CONFIRMED)", async () => {
      const { client, service: svc } = await setupService("FIXED");

      const booking = await service.createBooking(
        { serviceId: svc.id, scheduledAt: futureISO() },
        { userId: client.userId },
      );

      const cancelled = await service.cancelBooking(
        booking.id,
        { reason: "Changement de plans" },
        { userId: client.userId, role: "CLIENT" },
      );

      expect(cancelled.status).toBe("CANCELLED");
      expect(cancelled.canceledAt).not.toBeNull();
    });

    it("annule par le pro (IN_PROGRESS)", async () => {
      const { pro, client, service: svc } = await setupService("FIXED");

      const booking = await service.createBooking(
        { serviceId: svc.id, scheduledAt: futureISO() },
        { userId: client.userId },
      );

      await service.startBooking(booking.id, {
        userId: pro.userId,
        role: "PROFESSIONAL",
      });

      const cancelled = await service.cancelBooking(
        booking.id,
        {},
        { userId: pro.userId, role: "PROFESSIONAL" },
      );

      expect(cancelled.status).toBe("CANCELLED");
    });

    it("annule par admin", async () => {
      const { client, service: svc } = await setupService("FIXED");
      const admin = await seedTenant(prisma);

      const booking = await service.createBooking(
        { serviceId: svc.id, scheduledAt: futureISO() },
        { userId: client.userId },
      );

      const cancelled = await service.cancelBooking(
        booking.id,
        {},
        { userId: admin.userId, role: "ADMIN" },
      );

      expect(cancelled.status).toBe("CANCELLED");
    });

    it("refuse d'annuler un booking COMPLETED", async () => {
      const { pro, client, service: svc } = await setupService("FIXED");

      const booking = await service.createBooking(
        { serviceId: svc.id, scheduledAt: futureISO() },
        { userId: client.userId },
      );
      await service.startBooking(booking.id, {
        userId: pro.userId,
        role: "PROFESSIONAL",
      });
      await service.completeBooking(
        booking.id,
        {},
        { userId: pro.userId, role: "PROFESSIONAL" },
      );

      await expect(
        service.cancelBooking(
          booking.id,
          {},
          { userId: client.userId, role: "CLIENT" },
        ),
      ).rejects.toMatchObject({ code: "BOOKING_INVALID_STATE" });
    });
  });

  /* ================================================================
   * NO-SHOW
   * ================================================================ */

  describe("noShowBooking", () => {
    it("marque NO_SHOW sur booking passé", async () => {
      const { pro, client, service: svc } = await setupService("FIXED");

      const booking = await service.createBooking(
        { serviceId: svc.id, scheduledAt: futureISO() },
        { userId: client.userId },
      );

      /* Forcer scheduledAt dans le passé */
      await prisma.booking.update({
        where: { id: booking.id },
        data: { scheduledAt: new Date(Date.now() - 3600e3) },
      });

      const noShow = await service.noShowBooking(booking.id, {
        userId: pro.userId,
        role: "PROFESSIONAL",
      });

      expect(noShow.status).toBe("NO_SHOW");
    });

    it("refuse no-show sur booking futur", async () => {
      const { pro, client, service: svc } = await setupService("FIXED");

      const booking = await service.createBooking(
        { serviceId: svc.id, scheduledAt: futureISO() },
        { userId: client.userId },
      );

      await expect(
        service.noShowBooking(booking.id, {
          userId: pro.userId,
          role: "PROFESSIONAL",
        }),
      ).rejects.toMatchObject({ code: "INVALID_BOOKING_DATE" });
    });
  });

  /* ================================================================
   * LIST
   * ================================================================ */

  describe("listMyBookings", () => {
    it("pagine correctement", async () => {
      const { client, service: svc } = await setupService("FIXED");

      for (let i = 0; i < 3; i++) {
        await service.createBooking(
          {
            serviceId: svc.id,
            scheduledAt: futureISO((i + 1) * 864e5),
          },
          { userId: client.userId },
        );
      }

      const page = await service.listMyBookings(
        { userId: client.userId },
        { limit: 2 },
      );

      expect(page.data).toHaveLength(2);
      expect(page.hasMore).toBe(true);
      expect(page.nextCursor).toBeTruthy();
    });

    it("filtre par statut", async () => {
      const { client, service: svc } = await setupService("FIXED");

      const b1 = await service.createBooking(
        { serviceId: svc.id, scheduledAt: futureISO(864e5) },
        { userId: client.userId },
      );
      await service.createBooking(
        { serviceId: svc.id, scheduledAt: futureISO(2 * 864e5) },
        { userId: client.userId },
      );

      await service.cancelBooking(
        b1.id,
        {},
        { userId: client.userId, role: "CLIENT" },
      );

      const page = await service.listMyBookings(
        { userId: client.userId },
        { status: "CANCELLED", limit: 10 },
      );

      expect(page.data).toHaveLength(1);
      expect(page.data[0].id).toBe(b1.id);
    });
  });

  describe("listProfessionalBookings", () => {
    it("liste les bookings reçus par le pro", async () => {
      const { pro, client, service: svc } = await setupService("FIXED");

      await service.createBooking(
        { serviceId: svc.id, scheduledAt: futureISO() },
        { userId: client.userId },
      );

      const page = await service.listProfessionalBookings(
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

  describe("getBooking", () => {
    it("retourne le booking au client propriétaire", async () => {
      const { client, service: svc } = await setupService("FIXED");

      const booking = await service.createBooking(
        { serviceId: svc.id, scheduledAt: futureISO() },
        { userId: client.userId },
      );

      const fetched = await service.getBooking(booking.id, {
        userId: client.userId,
      });

      expect(fetched!.id).toBe(booking.id);
    });

    it("refuse à un tiers", async () => {
      const { client, service: svc } = await setupService("FIXED");
      const other = await seedTenant(prisma);

      const booking = await service.createBooking(
        { serviceId: svc.id, scheduledAt: futureISO() },
        { userId: client.userId },
      );

      await expect(
        service.getBooking(booking.id, { userId: other.userId }),
      ).rejects.toMatchObject({ code: "UNAUTHORIZED_BOOKING" });
    });
  });
});