// apps/api/src/modules/services/tests/service.service.integration.test.ts

import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";

import { PrismaClient } from "../../../generated/prisma/client";
import { startPostgres, stopPostgres } from "../../../../tests/setup/postgres";
import { seedTenant, truncateAll } from "../../../../tests/helpers/factories";

import { ServiceService } from "../services/service.service";
import { ServiceRepository } from "../repositories/service.repository";
import { ServiceImageRepository } from "../repositories/service-image.repository";
import { ServiceZoneRepository } from "../repositories/service-zone.repository";
import { AvailabilityRepository } from "../repositories/availability.repository";

describe("ServiceService (integration)", () => {
  let prisma: PrismaClient;
  let service: ServiceService;

  beforeAll(async () => {
    const ctx = await startPostgres();
    prisma = ctx.prisma;

    service = new ServiceService(
      prisma,
      new ServiceRepository(prisma),
      new ServiceImageRepository(prisma),
      new ServiceZoneRepository(prisma),
      new AvailabilityRepository(prisma),
    );
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

  async function setupProfessional() {
    const tenant = await seedTenant(prisma);
    return tenant;
  }

  function buildCreateDto(categoryId: string, overrides?: {
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
      pricingModel: overrides?.pricingModel ?? "QUOTE" as const,
      basePrice: overrides?.basePrice ?? null,
      currency: "XOF" as const,
      durationMin: 60,
      status: "DRAFT" as const,
    };
  }

  /* ================================================================
   * CREATE — simple
   * ================================================================ */

  describe("createService", () => {
    it("crée un service sur devis", async () => {
      const tenant = await setupProfessional();

      const result = await service.createService(
        buildCreateDto(tenant.categoryId),
        { userId: tenant.userId },
      );

      expect(result.id).toBeDefined();
      expect(result.slug).toMatch(/^reparation-/);
      expect(result.pricingModel).toBe("QUOTE");
      expect(result.basePrice).toBeNull();
      expect(result.status).toBe("DRAFT");
    });

    it("crée un service à prix fixe", async () => {
      const tenant = await setupProfessional();

      const result = await service.createService(
        buildCreateDto(tenant.categoryId, {
          pricingModel: "FIXED",
          basePrice: 25000,
        }),
        { userId: tenant.userId },
      );

      expect(result.pricingModel).toBe("FIXED");
      expect(result.basePrice?.toString()).toBe("25000");
    });

    it("refuse QUOTE avec basePrice", async () => {
      const tenant = await setupProfessional();

      await expect(
        service.createService(
          buildCreateDto(tenant.categoryId, {
            pricingModel: "QUOTE",
            basePrice: 10000,
          }),
          { userId: tenant.userId },
        ),
      ).rejects.toMatchObject({
        code: "INVALID_PRICING_MODEL",
      });
    });

    it("refuse FIXED sans basePrice", async () => {
      const tenant = await setupProfessional();

      await expect(
        service.createService(
          buildCreateDto(tenant.categoryId, {
            pricingModel: "FIXED",
            basePrice: null,
          }),
          { userId: tenant.userId },
        ),
      ).rejects.toMatchObject({
        code: "INVALID_PRICING_MODEL",
      });
    });

    it("refuse si pas de profil professionnel", async () => {
      const user = await prisma.user.create({
        data: {
          email: `no-pro-${Date.now()}@test.dev`,
          passwordHash: "hash",
          firstName: "No",
          lastName: "Pro",
          status: "ACTIVE",
        },
      });

      const tenant = await setupProfessional();

      await expect(
        service.createService(
          buildCreateDto(tenant.categoryId),
          { userId: user.id },
        ),
      ).rejects.toMatchObject({
        code: "PROFESSIONAL_NOT_FOUND",
      });
    });

    it("refuse si slug dupliqué pour le même pro", async () => {
      const tenant = await setupProfessional();

      await service.createService(
        buildCreateDto(tenant.categoryId, { slug: "unique-slug" }),
        { userId: tenant.userId },
      );

      await expect(
        service.createService(
          buildCreateDto(tenant.categoryId, { slug: "unique-slug" }),
          { userId: tenant.userId },
        ),
      ).rejects.toMatchObject({
        code: "SERVICE_SLUG_TAKEN",
      });
    });

    it("refuse si catégorie introuvable", async () => {
      const tenant = await setupProfessional();

      await expect(
        service.createService(
          buildCreateDto("00000000-0000-0000-0000-000000000000"),
          { userId: tenant.userId },
        ),
      ).rejects.toMatchObject({
        code: "CATEGORY_NOT_FOUND",
      });
    });
  });

  /* ================================================================
   * CREATE FULL
   * ================================================================ */

  describe("createServiceFull", () => {
    it("crée un service complet avec images, zones, availabilities", async () => {
      const tenant = await setupProfessional();

      const result = await service.createServiceFull(
        {
          ...buildCreateDto(tenant.categoryId, {
            pricingModel: "FIXED",
            basePrice: 15000,
          }),
          images: [
            { objectKey: "services/img1.jpg", sortOrder: 0, isPrimary: true, altText: null },
            { objectKey: "services/img2.jpg", sortOrder: 1, isPrimary: false, altText: null },
          ],
          zones: [
            { city: "Bamako", region: null, radiusKm: null },
            { city: null, region: "Ségou", radiusKm: null },
          ],
          availabilities: [
            {
              dayOfWeek: 1,
              startTime: "09:00",
              endTime: "12:00",
              specificDate: null,
              isRecurring: true,
            },
            {
              dayOfWeek: 1,
              startTime: "14:00",
              endTime: "17:00",
              specificDate: null,
              isRecurring: true,
            },
          ],
        },
        { userId: tenant.userId },
      );

      expect(result!.images).toHaveLength(2);
      expect(result!.zones).toHaveLength(2);
      expect(result!.availabilities).toHaveLength(2);

      const primaries = result!.images.filter((i) => i.isPrimary);
      expect(primaries).toHaveLength(1);
    });

    it("ROLLBACK si une availability est invalide", async () => {
      const tenant = await setupProfessional();

      await expect(
        service.createServiceFull(
          {
            ...buildCreateDto(tenant.categoryId),
            availabilities: [
              {
                dayOfWeek: 1,
                startTime: "14:00",
                endTime: "09:00", // ← start > end
                specificDate: null,
                isRecurring: true,
              },
            ],
          },
          { userId: tenant.userId },
        ),
      ).rejects.toMatchObject({
        code: "INVALID_AVAILABILITY",
      });

      /* Vérifier qu'aucun service n'a été créé */
      const count = await prisma.service.count({
        where: { professional: { userId: tenant.userId } },
      });
      expect(count).toBe(0);
    });

    it("refuse deux availabilities qui se chevauchent", async () => {
      const tenant = await setupProfessional();

      await expect(
        service.createServiceFull(
          {
            ...buildCreateDto(tenant.categoryId),
            availabilities: [
              {
                dayOfWeek: 1,
                startTime: "09:00",
                endTime: "12:00",
                specificDate: null,
                isRecurring: true,
              },
              {
                dayOfWeek: 1,
                startTime: "11:00",
                endTime: "14:00",
                specificDate: null,
                isRecurring: true,
              },
            ],
          },
          { userId: tenant.userId },
        ),
      ).rejects.toMatchObject({
        code: "INVALID_AVAILABILITY",
      });
    });

    it("refuse 2 zones identiques (city + region null)", async () => {
      const tenant = await setupProfessional();

      /* Note : le DTO Zod rejette déjà, mais on vérifie la robustesse */
      await expect(
        service.createServiceFull(
          {
            ...buildCreateDto(tenant.categoryId),
            zones: [
              { city: null, region: null, radiusKm: null },
            ],
          } as any,
          { userId: tenant.userId },
        ),
      ).rejects.toThrow();
    });
  });

  /* ================================================================
   * GET / LIST
   * ================================================================ */

  describe("getService / list", () => {
    it("retourne un service avec ses relations", async () => {
      const tenant = await setupProfessional();

      const created = await service.createServiceFull(
        {
          ...buildCreateDto(tenant.categoryId, { pricingModel: "FIXED", basePrice: 10000 }),
          images: [{ objectKey: "img.jpg", sortOrder: 0, isPrimary: true, altText: null }],
        },
        { userId: tenant.userId },
      );

      const fetched = await service.getService(created!.id);

      expect(fetched.images).toHaveLength(1);
      expect(fetched.zones).toHaveLength(0);
      expect(fetched.availabilities).toHaveLength(0);
    });

    it("retourne 404 si introuvable", async () => {
      await expect(
        service.getService("00000000-0000-0000-0000-000000000000"),
      ).rejects.toMatchObject({
        code: "SERVICE_NOT_FOUND",
      });
    });

    it("liste les services d'un professionnel", async () => {
      const tenant = await setupProfessional();

      await service.createService(
        buildCreateDto(tenant.categoryId, { slug: "svc-1" }),
        { userId: tenant.userId },
      );
      await service.createService(
        buildCreateDto(tenant.categoryId, { slug: "svc-2" }),
        { userId: tenant.userId },
      );

      const list = await service.listMyServices({ userId: tenant.userId });
      expect(list).toHaveLength(2);
    });
  });

  /* ================================================================
   * UPDATE
   * ================================================================ */

  describe("updateService", () => {
    it("met à jour le nom et la description", async () => {
      const tenant = await setupProfessional();

      const created = await service.createService(
        buildCreateDto(tenant.categoryId),
        { userId: tenant.userId },
      );

      const updated = await service.updateService(
        created.id,
        { name: "Nouveau nom", description: "Nouvelle description" },
        { userId: tenant.userId },
      );

      expect(updated.name).toBe("Nouveau nom");
      expect(updated.description).toBe("Nouvelle description");
    });

    it("refuse si non-propriétaire", async () => {
      const tenantA = await setupProfessional();
      const tenantB = await setupProfessional();

      const created = await service.createService(
        buildCreateDto(tenantA.categoryId),
        { userId: tenantA.userId },
      );

      await expect(
        service.updateService(
          created.id,
          { name: "Hack" },
          { userId: tenantB.userId },
        ),
      ).rejects.toMatchObject({
        code: "UNAUTHORIZED_SERVICE",
      });
    });

    it("refuse de modifier un service archivé", async () => {
      const tenant = await setupProfessional();

      const created = await service.createService(
        buildCreateDto(tenant.categoryId),
        { userId: tenant.userId },
      );

      await service.archiveService(created.id, { userId: tenant.userId });

      await expect(
        service.updateService(
          created.id,
          { name: "Hack" },
          { userId: tenant.userId },
        ),
      ).rejects.toMatchObject({
        code: "SERVICE_INVALID_STATE",
      });
    });
  });

  /* ================================================================
   * ACTIVATE / ARCHIVE
   * ================================================================ */

  describe("activateService / archiveService", () => {
    it("active un service DRAFT", async () => {
      const tenant = await setupProfessional();

      const created = await service.createService(
        buildCreateDto(tenant.categoryId),
        { userId: tenant.userId },
      );

      const activated = await service.activateService(created.id, {
        userId: tenant.userId,
      });

      expect(activated.status).toBe("ACTIVE");
    });

    it("refuse d'activer un service archivé", async () => {
      const tenant = await setupProfessional();

      const created = await service.createService(
        buildCreateDto(tenant.categoryId),
        { userId: tenant.userId },
      );

      await service.archiveService(created.id, { userId: tenant.userId });

      await expect(
        service.activateService(created.id, { userId: tenant.userId }),
      ).rejects.toMatchObject({
        code: "SERVICE_INVALID_STATE",
      });
    });

    it("archive un service", async () => {
      const tenant = await setupProfessional();

      const created = await service.createService(
        buildCreateDto(tenant.categoryId),
        { userId: tenant.userId },
      );

      const archived = await service.archiveService(created.id, {
        userId: tenant.userId,
      });

      expect(archived.status).toBe("ARCHIVED");
    });
  });

  /* ================================================================
   * IMAGES
   * ================================================================ */

  describe("addImage / deleteImage / reorderImages", () => {
    it("la première image devient primaire automatiquement", async () => {
      const tenant = await setupProfessional();

      const created = await service.createService(
        buildCreateDto(tenant.categoryId),
        { userId: tenant.userId },
      );

      const image = await service.addImage(
        created.id,
        {
          objectKey: "img.jpg",
          sortOrder: 0,
          isPrimary: false,
          altText: null,
        },
        { userId: tenant.userId },
      );

      expect(image.isPrimary).toBe(true);
    });

    it("créer une nouvelle primaire démarque l'ancienne", async () => {
      const tenant = await setupProfessional();

      const created = await service.createService(
        buildCreateDto(tenant.categoryId),
        { userId: tenant.userId },
      );

      const first = await service.addImage(
        created.id,
        { objectKey: "img1.jpg", sortOrder: 0, isPrimary: true, altText: null },
        { userId: tenant.userId },
      );

      const second = await service.addImage(
        created.id,
        { objectKey: "img2.jpg", sortOrder: 1, isPrimary: true, altText: null },
        { userId: tenant.userId },
      );

      expect(second.isPrimary).toBe(true);

      const refreshedFirst = await prisma.serviceImage.findUnique({
        where: { id: first.id },
      });
      expect(refreshedFirst!.isPrimary).toBe(false);
    });

    it("suppression de la primaire promeut la suivante", async () => {
      const tenant = await setupProfessional();

      const created = await service.createService(
        buildCreateDto(tenant.categoryId),
        { userId: tenant.userId },
      );

      const first = await service.addImage(
        created.id,
        { objectKey: "img1.jpg", sortOrder: 0, isPrimary: true, altText: null },
        { userId: tenant.userId },
      );

      const second = await service.addImage(
        created.id,
        { objectKey: "img2.jpg", sortOrder: 1, isPrimary: false, altText: null },
        { userId: tenant.userId },
      );

      await service.deleteImage(first.id, { userId: tenant.userId });

      const refreshedSecond = await prisma.serviceImage.findUnique({
        where: { id: second.id },
      });
      expect(refreshedSecond!.isPrimary).toBe(true);
    });

    it("réordonne les images", async () => {
      const tenant = await setupProfessional();

      const created = await service.createService(
        buildCreateDto(tenant.categoryId),
        { userId: tenant.userId },
      );

      const a = await service.addImage(
        created.id,
        { objectKey: "a.jpg", sortOrder: 0, isPrimary: true, altText: null },
        { userId: tenant.userId },
      );
      const b = await service.addImage(
        created.id,
        { objectKey: "b.jpg", sortOrder: 1, isPrimary: false, altText: null },
        { userId: tenant.userId },
      );

      const reordered = await service.reorderImages(
        created.id,
        [b.id, a.id],
        { userId: tenant.userId },
      );

      /* L'image primaire (a) est retournée en premier, mais on vérifie
       * les sortOrder réels */
      const map = new Map(reordered.map((i) => [i.id, i.sortOrder]));
      expect(map.get(b.id)).toBe(0);
      expect(map.get(a.id)).toBe(1);
    });
  });

  /* ================================================================
   * ZONES
   * ================================================================ */

  describe("addZone / deleteZone", () => {
    it("ajoute une zone", async () => {
      const tenant = await setupProfessional();

      const created = await service.createService(
        buildCreateDto(tenant.categoryId),
        { userId: tenant.userId },
      );

      const zone = await service.addZone(
        created.id,
        { city: "Bamako", region: null, radiusKm: null },
        { userId: tenant.userId },
      );

      expect(zone.city).toBe("Bamako");
    });

    it("supprime une zone", async () => {
      const tenant = await setupProfessional();

      const created = await service.createService(
        buildCreateDto(tenant.categoryId),
        { userId: tenant.userId },
      );

      const zone = await service.addZone(
        created.id,
        { city: "Bamako", region: null, radiusKm: null },
        { userId: tenant.userId },
      );

      await service.deleteZone(zone.id, { userId: tenant.userId });

      const refreshed = await prisma.serviceZone.findUnique({
        where: { id: zone.id },
      });
      expect(refreshed).toBeNull();
    });
  });

  /* ================================================================
   * AVAILABILITIES
   * ================================================================ */

  describe("addAvailability / deleteAvailability", () => {
    it("ajoute une disponibilité récurrente", async () => {
      const tenant = await setupProfessional();

      const created = await service.createService(
        buildCreateDto(tenant.categoryId),
        { userId: tenant.userId },
      );

      const avail = await service.addAvailability(
        created.id,
        {
          dayOfWeek: 1,
          startTime: "09:00",
          endTime: "12:00",
          specificDate: null,
          isRecurring: true,
        },
        { userId: tenant.userId },
      );

      expect(avail.dayOfWeek).toBe(1);
      expect(avail.isRecurring).toBe(true);
    });

    it("refuse chevauchement de créneaux récurrents", async () => {
      const tenant = await setupProfessional();

      const created = await service.createService(
        buildCreateDto(tenant.categoryId),
        { userId: tenant.userId },
      );

      await service.addAvailability(
        created.id,
        {
          dayOfWeek: 1,
          startTime: "09:00",
          endTime: "12:00",
          specificDate: null,
          isRecurring: true,
        },
        { userId: tenant.userId },
      );

      await expect(
        service.addAvailability(
          created.id,
          {
            dayOfWeek: 1,
            startTime: "11:00",
            endTime: "14:00",
            specificDate: null,
            isRecurring: true,
          },
          { userId: tenant.userId },
        ),
      ).rejects.toMatchObject({
        code: "INVALID_AVAILABILITY",
      });
    });

    it("ajoute une disponibilité ponctuelle", async () => {
      const tenant = await setupProfessional();

      const created = await service.createService(
        buildCreateDto(tenant.categoryId),
        { userId: tenant.userId },
      );

      const avail = await service.addAvailability(
        created.id,
        {
          dayOfWeek: null,
          startTime: null,
          endTime: null,
          specificDate: "2026-12-25",
          isRecurring: false,
        },
        { userId: tenant.userId },
      );

      expect(avail.isRecurring).toBe(false);
      expect(avail.specificDate).toBeDefined();
    });

    it("refuse 2 disponibilités à la même date", async () => {
      const tenant = await setupProfessional();

      const created = await service.createService(
        buildCreateDto(tenant.categoryId),
        { userId: tenant.userId },
      );

      await service.addAvailability(
        created.id,
        {
          dayOfWeek: null,
          startTime: null,
          endTime: null,
          specificDate: "2026-12-25",
          isRecurring: false,
        },
        { userId: tenant.userId },
      );

      await expect(
        service.addAvailability(
          created.id,
          {
            dayOfWeek: null,
            startTime: null,
            endTime: null,
            specificDate: "2026-12-25",
            isRecurring: false,
          },
          { userId: tenant.userId },
        ),
      ).rejects.toMatchObject({
        code: "INVALID_AVAILABILITY",
      });
    });
  });
});