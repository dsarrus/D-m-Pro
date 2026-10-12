// apps/api/src/modules/services/services/service.service.ts

import { Prisma, PrismaClient } from "../../../generated/prisma/client";

import { ServiceRepository } from "../repositories/service.repository";
import { ServiceImageRepository } from "../repositories/service-image.repository";
import { ServiceZoneRepository } from "../repositories/service-zone.repository";
import { AvailabilityRepository } from "../repositories/availability.repository";
import { ServiceError, ServiceErrorCode } from "../errors/service.error";

import type {
  CreateServiceDto,
  CreateServiceFullDto,
  UpdateServiceDto,
  ServiceImageDto,
  ServiceZoneDto,
  AvailabilityDto,
  ListServicesQuery,
} from "../dtos/service.dto";

/* ================================================================
 * TYPES
 * ================================================================ */

export type AuthContext = {
  userId: string;
  role?: string;
  permissions?: string[];
};

const SERIALIZABLE_MAX_ATTEMPTS = 3;
const TRANSACTION_TIMEOUT_MS = 15000;
const MAX_IMAGES_PER_SERVICE = 20;
const MAX_ZONES_PER_SERVICE = 50;
const MAX_AVAILABILITIES_PER_SERVICE = 50;

/* ================================================================
 * SERVICE
 * ================================================================ */

export class ServiceService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly repository: ServiceRepository,
    private readonly imageRepository: ServiceImageRepository,
    private readonly zoneRepository: ServiceZoneRepository,
    private readonly availabilityRepository: AvailabilityRepository,
  ) {}

  /* ================================================================
   * HELPERS
   * ================================================================ */

  private async withSerializableRetry<T>(
    fn: () => Promise<T>,
    maxAttempts = SERIALIZABLE_MAX_ATTEMPTS,
  ): Promise<T> {
    let attempt = 0;

    // eslint-disable-next-line no-constant-condition
    while (true) {
      try {
        return await fn();
      } catch (error) {
        attempt++;

        const isSerializationConflict =
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === "P2034";

        if (!isSerializationConflict || attempt >= maxAttempts) {
          throw error;
        }

        const delay =
          Math.min(100 * 2 ** attempt, 2000) +
          Math.floor(Math.random() * 100);

        await new Promise((r) => setTimeout(r, delay));
      }
    }
  }

  private async loadProfessional(
    db: Prisma.TransactionClient | PrismaClient,
    userId: string,
  ) {
    const professional = await db.professionalProfile.findUnique({
      where: { userId },
      select: {
        id: true,
        userId: true,
        verificationStatus: true,
      },
    });

    if (!professional) {
      throw new ServiceError(
        ServiceErrorCode.PROFESSIONAL_NOT_FOUND,
        "Profil professionnel introuvable.",
      );
    }

    return professional;
  }

  private async loadAuthorizedService(
    db: Prisma.TransactionClient | PrismaClient,
    serviceId: string,
    userId: string,
  ) {
    const service = await db.service.findUnique({
      where: { id: serviceId },
      include: {
        professional: {
          select: { userId: true },
        },
      },
    });

    if (!service) {
      throw new ServiceError(
        ServiceErrorCode.SERVICE_NOT_FOUND,
        "Service introuvable.",
      );
    }

    if (service.professional.userId !== userId) {
      throw new ServiceError(
        ServiceErrorCode.UNAUTHORIZED_SERVICE,
        "Vous n'êtes pas autorisé à modifier ce service.",
      );
    }

    return service;
  }

  private async assertSlugFree(
    db: Prisma.TransactionClient | PrismaClient,
    professionalId: string,
    slug: string,
    excludeServiceId?: string,
  ): Promise<void> {
    const existing = await db.service.findFirst({
      where: {
        professionalId,
        slug,
        ...(excludeServiceId ? { NOT: { id: excludeServiceId } } : {}),
      },
      select: { id: true },
    });

    if (existing) {
      throw new ServiceError(
        ServiceErrorCode.SERVICE_SLUG_TAKEN,
        `Le slug "${slug}" est déjà utilisé pour ce professionnel.`,
      );
    }
  }

  private async assertCategoryExists(
    db: Prisma.TransactionClient | PrismaClient,
    categoryId: string,
  ): Promise<void> {
    const category = await db.category.findUnique({
      where: { id: categoryId },
      select: { id: true },
    });

    if (!category) {
      throw new ServiceError(
        ServiceErrorCode.CATEGORY_NOT_FOUND,
        "Catégorie introuvable.",
      );
    }
  }

  /* ================================================================
   * VALIDATIONS MÉTIER
   * ================================================================ */

  private validatePricing(
    pricingModel: string,
    basePrice: number | null | undefined,
  ): void {
    if (pricingModel === "QUOTE" && basePrice != null) {
      throw new ServiceError(
        ServiceErrorCode.INVALID_PRICING_MODEL,
        "Un service sur devis ne doit pas avoir de prix de base.",
      );
    }

    if (pricingModel !== "QUOTE" && basePrice == null) {
      throw new ServiceError(
        ServiceErrorCode.INVALID_PRICING_MODEL,
        "Un service FIXED ou HOURLY doit avoir un prix de base.",
      );
    }
  }

  private async validateAvailability(
    db: Prisma.TransactionClient | PrismaClient,
    serviceId: string,
    dto: AvailabilityDto,
  ): Promise<void> {
    if (dto.isRecurring) {
      if (
        dto.dayOfWeek == null ||
        dto.startTime == null ||
        dto.endTime == null
      ) {
        throw new ServiceError(
          ServiceErrorCode.INVALID_AVAILABILITY,
          "Une disponibilité récurrente doit avoir dayOfWeek, startTime et endTime.",
        );
      }

      if (dto.startTime >= dto.endTime) {
        throw new ServiceError(
          ServiceErrorCode.INVALID_AVAILABILITY,
          "startTime doit être antérieur à endTime.",
        );
      }

      const overlapping =
        await this.availabilityRepository.findOverlappingRecurring(
          serviceId,
          dto.dayOfWeek,
          dto.startTime,
          dto.endTime,
          db,
        );

      if (overlapping) {
        throw new ServiceError(
          ServiceErrorCode.INVALID_AVAILABILITY,
          "Cette plage horaire chevauche une disponibilité existante.",
        );
      }
    } else {
      if (!dto.specificDate) {
        throw new ServiceError(
          ServiceErrorCode.INVALID_AVAILABILITY,
          "Une disponibilité ponctuelle doit avoir specificDate.",
        );
      }

      const specific = new Date(dto.specificDate);

      const existing = await this.availabilityRepository.findSpecificDate(
        serviceId,
        specific,
        db,
      );

      if (existing) {
        throw new ServiceError(
          ServiceErrorCode.INVALID_AVAILABILITY,
          "Une disponibilité existe déjà pour cette date.",
        );
      }
    }
  }

  /* ================================================================
   * CREATE
   * ================================================================ */

  /**
   * Crée un service simple (sans images, zones, availabilities).
   */
  async createService(dto: CreateServiceDto, ctx: AuthContext) {
    try {
      return await this.withSerializableRetry(() =>
        this.prisma.$transaction(
          async (tx) => {
            const professional = await this.loadProfessional(tx, ctx.userId);

            await this.assertCategoryExists(tx, dto.categoryId);
            await this.assertSlugFree(tx, professional.id, dto.slug);

            this.validatePricing(dto.pricingModel, dto.basePrice);

            return this.repository.create(
              {
                professional: { connect: { id: professional.id } },
                category: { connect: { id: dto.categoryId } },
                name: dto.name,
                slug: dto.slug,
                description: dto.description ?? null,
                pricingModel: dto.pricingModel,
                basePrice:
                  dto.basePrice != null
                    ? new Prisma.Decimal(dto.basePrice)
                    : null,
                currency: dto.currency,
                durationMin: dto.durationMin ?? null,
                status: dto.status,
              },
              tx,
            );
          },
          {
            isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
            timeout: TRANSACTION_TIMEOUT_MS,
          },
        ),
      );
    } catch (error) {
      if (error instanceof ServiceError) throw error;
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === "P2002") {
          throw new ServiceError(
            ServiceErrorCode.SERVICE_SLUG_TAKEN,
            "Ce slug est déjà utilisé.",
          );
        }
      }
      throw error;
    }
  }

  /**
 * Crée un service complet dans une seule transaction :
 * Service + Images + Zones + Availabilities.
 *
 * Règles validées côté service (en plus du DTO) :
 *  - pricing model cohérent avec basePrice
 *  - slug unique par professionnel
 *  - catégorie existante
 *  - images : au plus 1 primaire, max MAX_IMAGES_PER_SERVICE
 *  - zones : au moins une info (city / region / radiusKm), max MAX_ZONES_PER_SERVICE
 *  - availabilities : chevauchements interdits (intra-DTO ET vs DB),
 *    max MAX_AVAILABILITIES_PER_SERVICE
 *
 * En cas d'échec à n'importe quelle étape, la transaction est rollback.
 */
async createServiceFull(dto: CreateServiceFullDto, ctx: AuthContext) {
  try {
    return await this.withSerializableRetry(() =>
      this.prisma.$transaction(
        async (tx) => {
          /* ============================================================
           * 1. Vérifications de base
           * ============================================================ */

          const professional = await this.loadProfessional(tx, ctx.userId);

          await this.assertCategoryExists(tx, dto.categoryId);
          await this.assertSlugFree(tx, professional.id, dto.slug);

          this.validatePricing(dto.pricingModel, dto.basePrice);

          /* ============================================================
           * 2. Créer le Service
           * ============================================================ */

          const service = await tx.service.create({
            data: {
              professional: { connect: { id: professional.id } },
              category: { connect: { id: dto.categoryId } },
              name: dto.name,
              slug: dto.slug,
              description: dto.description ?? null,
              pricingModel: dto.pricingModel,
              basePrice:
                dto.basePrice != null
                  ? new Prisma.Decimal(dto.basePrice)
                  : null,
              currency: dto.currency,
              durationMin: dto.durationMin ?? null,
              status: dto.status,
            },
          });

          /* ============================================================
           * 3. Images
           * ============================================================ */

          if (dto.images && dto.images.length > 0) {
            if (dto.images.length > MAX_IMAGES_PER_SERVICE) {
              throw new ServiceError(
                ServiceErrorCode.SERVICE_INVALID_STATE,
                `Maximum ${MAX_IMAGES_PER_SERVICE} images par service.`,
              );
            }

            let primaryAssigned = false;

            const imageData = dto.images.map((img) => {
              const isPrimary =
                Boolean(img.isPrimary) && !primaryAssigned;
              if (isPrimary) primaryAssigned = true;

              return {
                serviceId: service.id,
                objectKey: img.objectKey,
                altText: img.altText ?? null,
                sortOrder: img.sortOrder ?? 0,
                isPrimary,
              };
            });

            await tx.serviceImage.createMany({ data: imageData });
          }

          /* ============================================================
           * 4. Zones
           * ============================================================ */

          if (dto.zones && dto.zones.length > 0) {
            if (dto.zones.length > MAX_ZONES_PER_SERVICE) {
              throw new ServiceError(
                ServiceErrorCode.SERVICE_INVALID_STATE,
                `Maximum ${MAX_ZONES_PER_SERVICE} zones par service.`,
              );
            }

            /* Validation côté service : au moins une info par zone */
            for (const zone of dto.zones) {
              if (
                !zone.city &&
                !zone.region &&
                zone.radiusKm == null
              ) {
                throw new ServiceError(
                  ServiceErrorCode.INVALID_SERVICE_ZONE,
                  "Une zone doit avoir au moins une ville, une région ou un rayon.",
                );
              }
            }

            await tx.serviceZone.createMany({
              data: dto.zones.map((zone) => ({
                serviceId: service.id,
                city: zone.city ?? null,
                region: zone.region ?? null,
                radiusKm: zone.radiusKm ?? null,
              })),
            });
          }

          /* ============================================================
           * 5. Availabilities
           * ============================================================ */

          if (
            dto.availabilities &&
            dto.availabilities.length > 0
          ) {
            if (
              dto.availabilities.length >
              MAX_AVAILABILITIES_PER_SERVICE
            ) {
              throw new ServiceError(
                ServiceErrorCode.SERVICE_INVALID_STATE,
                `Maximum ${MAX_AVAILABILITIES_PER_SERVICE} disponibilités par service.`,
              );
            }

            /* ------------------------------------------------
             * 5.a — Validation intra-DTO :
             *        structure + chevauchements entre les
             *        availabilities fournies dans la requête
             * ------------------------------------------------ */

            const recurringByDay = new Map<
              number,
              Array<{ start: string; end: string }>
            >();
            const seenDates = new Set<string>();

            for (const avail of dto.availabilities) {
              if (avail.isRecurring) {
                /* Structure */
                if (
                  avail.dayOfWeek == null ||
                  avail.startTime == null ||
                  avail.endTime == null
                ) {
                  throw new ServiceError(
                    ServiceErrorCode.INVALID_AVAILABILITY,
                    "Disponibilité récurrente incomplète : dayOfWeek, startTime et endTime requis.",
                  );
                }

                if (avail.startTime >= avail.endTime) {
                  throw new ServiceError(
                    ServiceErrorCode.INVALID_AVAILABILITY,
                    `startTime (${avail.startTime}) doit être antérieur à endTime (${avail.endTime}).`,
                  );
                }

                /* Chevauchements intra-DTO pour le même jour */
                const day = avail.dayOfWeek;
                const existing = recurringByDay.get(day) ?? [];

                for (const slot of existing) {
                  const overlap =
                    avail.startTime < slot.end &&
                    slot.start < avail.endTime;

                  if (overlap) {
                    throw new ServiceError(
                      ServiceErrorCode.INVALID_AVAILABILITY,
                      `Chevauchement de créneaux pour le jour ${day} : [${slot.start}-${slot.end}] et [${avail.startTime}-${avail.endTime}].`,
                    );
                  }
                }

                existing.push({
                  start: avail.startTime,
                  end: avail.endTime,
                });
                recurringByDay.set(day, existing);
              } else {
                /* Ponctuelle */
                if (!avail.specificDate) {
                  throw new ServiceError(
                    ServiceErrorCode.INVALID_AVAILABILITY,
                    "Disponibilité ponctuelle doit avoir specificDate.",
                  );
                }

                if (seenDates.has(avail.specificDate)) {
                  throw new ServiceError(
                    ServiceErrorCode.INVALID_AVAILABILITY,
                    `Deux disponibilités à la même date : ${avail.specificDate}.`,
                  );
                }

                seenDates.add(avail.specificDate);
              }
            }

            /* ------------------------------------------------
             * 5.b — Validation vs DB (au cas où des créneaux
             *        existent déjà pour ce service — non
             *        applicable en création mais sécurité)
             * ------------------------------------------------ */

            for (const avail of dto.availabilities) {
              await this.validateAvailability(tx, service.id, avail);
            }

            /* ------------------------------------------------
             * 5.c — Insert en batch
             * ------------------------------------------------ */

            await tx.availability.createMany({
              data: dto.availabilities.map((avail) => ({
                serviceId: service.id,
                dayOfWeek: avail.dayOfWeek ?? null,
                startTime: avail.startTime ?? null,
                endTime: avail.endTime ?? null,
                specificDate: avail.specificDate
                  ? new Date(avail.specificDate)
                  : null,
                isRecurring: avail.isRecurring,
              })),
            });
          }

          /* ============================================================
           * 6. Recharger avec relations
           * ============================================================ */

          return tx.service.findUnique({
            where: { id: service.id },
            include: {
              images: {
                orderBy: [
                  { isPrimary: "desc" },
                  { sortOrder: "asc" },
                ],
              },
              zones: true,
              availabilities: {
                orderBy: [
                  { isRecurring: "desc" },
                  { dayOfWeek: "asc" },
                  { specificDate: "asc" },
                ],
              },
              category: {
                select: { id: true, name: true, slug: true },
              },
            },
          });
        },
        {
          isolationLevel:
            Prisma.TransactionIsolationLevel.Serializable,
          timeout: TRANSACTION_TIMEOUT_MS,
        },
      ),
    );
  } catch (error) {
    if (error instanceof ServiceError) throw error;

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        const target = Array.isArray(error.meta?.target)
          ? error.meta.target.join(",")
          : String(error.meta?.target ?? "");

        if (target.includes("slug")) {
          throw new ServiceError(
            ServiceErrorCode.SERVICE_SLUG_TAKEN,
            "Ce slug est déjà utilisé.",
          );
        }
      }
    }

    throw error;
  }
}

  /* ================================================================
   * GET / LIST
   * ================================================================ */

  async getService(serviceId: string) {
    const service = await this.repository.findById(serviceId);

    if (!service) {
      throw new ServiceError(
        ServiceErrorCode.SERVICE_NOT_FOUND,
        "Service introuvable.",
      );
    }

    return service;
  }

  async listMyServices(ctx: AuthContext) {
    const professional = await this.loadProfessional(this.prisma, ctx.userId);
    return this.repository.listByProfessional(professional.id);
  }

  async listServices(query: ListServicesQuery) {
    const results = await this.repository.list(query);

    const limit = Math.min(query.limit ?? 20, 100);
    const hasMore = results.length > limit;
    const data = hasMore ? results.slice(0, limit) : results;

    return {
      data,
      hasMore,
      nextCursor: hasMore ? data[data.length - 1]?.id ?? null : null,
    };
  }

  /* ================================================================
   * UPDATE
   * ================================================================ */

  async updateService(
    serviceId: string,
    dto: UpdateServiceDto,
    ctx: AuthContext,
  ) {
    try {
      return await this.withSerializableRetry(() =>
        this.prisma.$transaction(
          async (tx) => {
            const service = await this.loadAuthorizedService(
              tx,
              serviceId,
              ctx.userId,
            );

            if (service.status === "ARCHIVED") {
              throw new ServiceError(
                ServiceErrorCode.SERVICE_INVALID_STATE,
                "Impossible de modifier un service archivé.",
              );
            }

            if (dto.slug !== undefined && dto.slug !== service.slug) {
              await this.assertSlugFree(
                tx,
                service.professionalId,
                dto.slug,
                serviceId,
              );
            }

            if (dto.categoryId !== undefined) {
              await this.assertCategoryExists(tx, dto.categoryId);
            }

            /* Validation pricing */
            const effectivePricing = dto.pricingModel ?? service.pricingModel;
            const effectivePrice =
              dto.basePrice !== undefined ? dto.basePrice : service.basePrice;

            this.validatePricing(
              effectivePricing,
              effectivePrice != null ? Number(effectivePrice) : null,
            );

            const data: Prisma.ServiceUpdateInput = {};

            if (dto.categoryId !== undefined) {
              data.category = { connect: { id: dto.categoryId } };
            }
            if (dto.name !== undefined) data.name = dto.name;
            if (dto.slug !== undefined) data.slug = dto.slug;
            if (dto.description !== undefined) {
              data.description = dto.description;
            }
            if (dto.pricingModel !== undefined) {
              data.pricingModel = dto.pricingModel;
            }
            if (dto.basePrice !== undefined) {
              data.basePrice =
                dto.basePrice == null
                  ? null
                  : new Prisma.Decimal(dto.basePrice);
            }
            if (dto.currency !== undefined) data.currency = dto.currency;
            if (dto.durationMin !== undefined) {
              data.durationMin = dto.durationMin;
            }
            if (dto.status !== undefined) data.status = dto.status;

            return this.repository.update(serviceId, data, tx);
          },
          {
            isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
            timeout: TRANSACTION_TIMEOUT_MS,
          },
        ),
      );
    } catch (error) {
      if (error instanceof ServiceError) throw error;
      throw error;
    }
  }

  /* ================================================================
   * ACTIVATE / ARCHIVE
   * ================================================================ */

  async activateService(serviceId: string, ctx: AuthContext) {
    try {
      return await this.withSerializableRetry(() =>
        this.prisma.$transaction(
          async (tx) => {
            const service = await this.loadAuthorizedService(
              tx,
              serviceId,
              ctx.userId,
            );

            if (service.status === "ARCHIVED") {
              throw new ServiceError(
                ServiceErrorCode.SERVICE_INVALID_STATE,
                "Impossible d'activer un service archivé.",
              );
            }

            if (service.status === "ACTIVE") {
              return service;
            }

            return this.repository.update(
              serviceId,
              { status: "ACTIVE" },
              tx,
            );
          },
          {
            isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
            timeout: TRANSACTION_TIMEOUT_MS,
          },
        ),
      );
    } catch (error) {
      if (error instanceof ServiceError) throw error;
      throw error;
    }
  }

  async archiveService(serviceId: string, ctx: AuthContext) {
    try {
      return await this.withSerializableRetry(() =>
        this.prisma.$transaction(
          async (tx) => {
            const service = await this.loadAuthorizedService(
              tx,
              serviceId,
              ctx.userId,
            );

            if (service.status === "ARCHIVED") {
              return service;
            }

            return this.repository.update(
              serviceId,
              { status: "ARCHIVED" },
              tx,
            );
          },
          {
            isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
            timeout: TRANSACTION_TIMEOUT_MS,
          },
        ),
      );
    } catch (error) {
      if (error instanceof ServiceError) throw error;
      throw error;
    }
  }

  /* ================================================================
   * IMAGES
   * ================================================================ */

  async addImage(
    serviceId: string,
    dto: ServiceImageDto,
    ctx: AuthContext,
  ) {
    try {
      return await this.withSerializableRetry(() =>
        this.prisma.$transaction(
          async (tx) => {
            await this.loadAuthorizedService(tx, serviceId, ctx.userId);

            const count = await this.imageRepository.countByService(
              serviceId,
              tx,
            );

            if (count >= MAX_IMAGES_PER_SERVICE) {
              throw new ServiceError(
                ServiceErrorCode.SERVICE_INVALID_STATE,
                `Maximum ${MAX_IMAGES_PER_SERVICE} images par service.`,
              );
            }

            const shouldBePrimary = dto.isPrimary || count === 0;

            if (shouldBePrimary) {
              await this.imageRepository.unsetPrimary(serviceId, tx);
            }

            return this.imageRepository.create(
              {
                service: { connect: { id: serviceId } },
                objectKey: dto.objectKey,
                altText: dto.altText ?? null,
                sortOrder: dto.sortOrder,
                isPrimary: shouldBePrimary,
              },
              tx,
            );
          },
          {
            isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
            timeout: TRANSACTION_TIMEOUT_MS,
          },
        ),
      );
    } catch (error) {
      if (error instanceof ServiceError) throw error;
      throw error;
    }
  }

  async deleteImage(imageId: string, ctx: AuthContext) {
    try {
      return await this.withSerializableRetry(() =>
        this.prisma.$transaction(
          async (tx) => {
            const image = await this.imageRepository.findById(imageId, tx);

            if (!image) {
              throw new ServiceError(
                ServiceErrorCode.SERVICE_IMAGE_NOT_FOUND,
                "Image introuvable.",
              );
            }

            await this.loadAuthorizedService(
              tx,
              image.serviceId,
              ctx.userId,
            );

            const wasPrimary = image.isPrimary;

            await this.imageRepository.delete(imageId, tx);

            /* Promotion automatique si l'image supprimée était primaire */
            if (wasPrimary) {
              const candidate = await this.imageRepository.findNextCandidate(
                image.serviceId,
                undefined,
                tx,
              );

              if (candidate) {
                await tx.serviceImage.update({
                  where: { id: candidate.id },
                  data: { isPrimary: true },
                });
              }
            }

            return { id: imageId };
          },
          {
            isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
            timeout: TRANSACTION_TIMEOUT_MS,
          },
        ),
      );
    } catch (error) {
      if (error instanceof ServiceError) throw error;
      throw error;
    }
  }

  async reorderImages(
    serviceId: string,
    orderedImageIds: string[],
    ctx: AuthContext,
  ) {
    try {
      return await this.withSerializableRetry(() =>
        this.prisma.$transaction(
          async (tx) => {
            await this.loadAuthorizedService(tx, serviceId, ctx.userId);

            const existing = await tx.serviceImage.findMany({
              where: { serviceId },
              select: { id: true },
            });

            const existingIds = new Set(existing.map((i) => i.id));

            for (const id of orderedImageIds) {
              if (!existingIds.has(id)) {
                throw new ServiceError(
                  ServiceErrorCode.SERVICE_IMAGE_NOT_FOUND,
                  `Image ${id} introuvable pour ce service.`,
                );
              }
            }

            if (orderedImageIds.length !== existing.length) {
              throw new ServiceError(
                ServiceErrorCode.SERVICE_INVALID_STATE,
                "La liste doit contenir toutes les images du service.",
              );
            }

            for (let i = 0; i < orderedImageIds.length; i++) {
              await tx.serviceImage.update({
                where: { id: orderedImageIds[i] },
                data: { sortOrder: i },
              });
            }

            return tx.serviceImage.findMany({
              where: { serviceId },
              orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }],
            });
          },
          {
            isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
            timeout: TRANSACTION_TIMEOUT_MS,
          },
        ),
      );
    } catch (error) {
      if (error instanceof ServiceError) throw error;
      throw error;
    }
  }

  /* ================================================================
   * ZONES
   * ================================================================ */

  async addZone(
    serviceId: string,
    dto: ServiceZoneDto,
    ctx: AuthContext,
  ) {
    try {
      return await this.withSerializableRetry(() =>
        this.prisma.$transaction(
          async (tx) => {
            await this.loadAuthorizedService(tx, serviceId, ctx.userId);

            const count = await this.zoneRepository.countByService(
              serviceId,
              tx,
            );

            if (count >= MAX_ZONES_PER_SERVICE) {
              throw new ServiceError(
                ServiceErrorCode.SERVICE_INVALID_STATE,
                `Maximum ${MAX_ZONES_PER_SERVICE} zones par service.`,
              );
            }

            return this.zoneRepository.create(
              {
                service: { connect: { id: serviceId } },
                city: dto.city ?? null,
                region: dto.region ?? null,
                radiusKm: dto.radiusKm ?? null,
              },
              tx,
            );
          },
          {
            isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
            timeout: TRANSACTION_TIMEOUT_MS,
          },
        ),
      );
    } catch (error) {
      if (error instanceof ServiceError) throw error;
      throw error;
    }
  }

  async deleteZone(zoneId: string, ctx: AuthContext) {
    try {
      return await this.withSerializableRetry(() =>
        this.prisma.$transaction(
          async (tx) => {
            const zone = await this.zoneRepository.findById(zoneId, tx);

            if (!zone) {
              throw new ServiceError(
                ServiceErrorCode.SERVICE_ZONE_NOT_FOUND,
                "Zone introuvable.",
              );
            }

            await this.loadAuthorizedService(
              tx,
              zone.serviceId,
              ctx.userId,
            );

            await this.zoneRepository.delete(zoneId, tx);

            return { id: zoneId };
          },
          {
            isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
            timeout: TRANSACTION_TIMEOUT_MS,
          },
        ),
      );
    } catch (error) {
      if (error instanceof ServiceError) throw error;
      throw error;
    }
  }

  /* ================================================================
   * AVAILABILITIES
   * ================================================================ */

  async addAvailability(
    serviceId: string,
    dto: AvailabilityDto,
    ctx: AuthContext,
  ) {
    try {
      return await this.withSerializableRetry(() =>
        this.prisma.$transaction(
          async (tx) => {
            await this.loadAuthorizedService(tx, serviceId, ctx.userId);

            const count =
              await this.availabilityRepository.countByService(
                serviceId,
                tx,
              );

            if (count >= MAX_AVAILABILITIES_PER_SERVICE) {
              throw new ServiceError(
                ServiceErrorCode.SERVICE_INVALID_STATE,
                `Maximum ${MAX_AVAILABILITIES_PER_SERVICE} disponibilités par service.`,
              );
            }

            await this.validateAvailability(tx, serviceId, dto);

            return this.availabilityRepository.create(
              {
                service: { connect: { id: serviceId } },
                dayOfWeek: dto.dayOfWeek ?? null,
                startTime: dto.startTime ?? null,
                endTime: dto.endTime ?? null,
                specificDate: dto.specificDate
                  ? new Date(dto.specificDate)
                  : null,
                isRecurring: dto.isRecurring,
              },
              tx,
            );
          },
          {
            isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
            timeout: TRANSACTION_TIMEOUT_MS,
          },
        ),
      );
    } catch (error) {
      if (error instanceof ServiceError) throw error;
      throw error;
    }
  }

  async deleteAvailability(availabilityId: string, ctx: AuthContext) {
    try {
      return await this.withSerializableRetry(() =>
        this.prisma.$transaction(
          async (tx) => {
            const availability =
              await this.availabilityRepository.findById(
                availabilityId,
                tx,
              );

            if (!availability) {
              throw new ServiceError(
                ServiceErrorCode.AVAILABILITY_NOT_FOUND,
                "Disponibilité introuvable.",
              );
            }

            await this.loadAuthorizedService(
              tx,
              availability.serviceId,
              ctx.userId,
            );

            await this.availabilityRepository.delete(availabilityId, tx);

            return { id: availabilityId };
          },
          {
            isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
            timeout: TRANSACTION_TIMEOUT_MS,
          },
        ),
      );
    } catch (error) {
      if (error instanceof ServiceError) throw error;
      throw error;
    }
  }
}