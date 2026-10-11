// apps/api/src/modules/stores/services/store.service.ts

import { Prisma, PrismaClient } from "../../../generated/prisma/client";

import { StoreRepository } from "../repositories/store.repository";
import { StoreError, StoreErrorCode } from "../errors/store-error";

import type {
  CreateStoreDto,
  UpdateStoreDto,
} from "../dtos/store.dto";

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

/* ================================================================
 * SERVICE
 * ================================================================ */

export class StoreService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly repository: StoreRepository,
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

  /**
   * Charge le profil professionnel lié à l'utilisateur courant.
   * Lance PROFESSIONAL_NOT_FOUND si l'utilisateur n'a pas de profil.
   */
  private async loadProfessional(
    db: Prisma.TransactionClient | PrismaClient,
    userId: string,
  ) {
    const professional = await db.professionalProfile.findUnique({
      where: { userId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            status: true,
          },
        },
      },
    });

    if (!professional) {
      throw new StoreError(
        StoreErrorCode.PROFESSIONAL_NOT_FOUND,
        "Profil professionnel introuvable. Créez d'abord votre profil.",
      );
    }

    return professional;
  }

  /**
   * Charge un store + vérifie l'ownership.
   */
  private async loadAuthorizedStore(
    db: Prisma.TransactionClient | PrismaClient,
    storeId: string,
    userId: string,
  ) {
    const store = await this.repository.findById(storeId, db);

    if (!store) {
      throw new StoreError(
        StoreErrorCode.STORE_NOT_FOUND,
        "Boutique introuvable.",
      );
    }

    if (store.professional.userId !== userId) {
      throw new StoreError(
        StoreErrorCode.UNAUTHORIZED_STORE,
        "Vous n'êtes pas autorisé à modifier cette boutique.",
      );
    }

    return store;
  }

  /**
   * Vérifie qu'un slug n'est pas déjà utilisé.
   */
  private async assertSlugFree(
    db: Prisma.TransactionClient | PrismaClient,
    slug: string,
    excludeStoreId?: string,
  ): Promise<void> {
    const existing = await db.store.findFirst({
      where: {
        slug,
        ...(excludeStoreId ? { NOT: { id: excludeStoreId } } : {}),
      },
      select: { id: true },
    });

    if (existing) {
      throw new StoreError(
        StoreErrorCode.STORE_SLUG_TAKEN,
        `Le slug "${slug}" est déjà utilisé.`,
      );
    }
  }

  /* ================================================================
   * CREATE
   * ================================================================ */

  /**
   * Crée une boutique pour le professionnel courant.
   *
   * Règles :
   *  - 1 seule boutique par professionnel
   *  - slug unique global
   *  - status initial = DRAFT
   */
  async createStore(dto: CreateStoreDto, ctx: AuthContext) {
    try {
      return await this.withSerializableRetry(() =>
        this.prisma.$transaction(
          async (tx) => {
            const professional = await this.loadProfessional(tx, ctx.userId);

            /* Vérifier : 1 seule boutique par pro */
            const existing = await this.repository.findByProfessionalId(
              professional.id,
              tx,
            );

            if (existing) {
              throw new StoreError(
                StoreErrorCode.STORE_ALREADY_EXISTS,
                "Vous avez déjà une boutique. Un professionnel ne peut avoir qu'une seule boutique.",
              );
            }

            /* Vérifier slug unique */
            await this.assertSlugFree(tx, dto.slug);

            /* Créer */
            return this.repository.create(
              {
                professional: { connect: { id: professional.id } },
                name: dto.name,
                slug: dto.slug,
                description: dto.description ?? null,
                logoKey: dto.logoKey ?? null,
                bannerKey: dto.bannerKey ?? null,
                status: "DRAFT",
                latitude: dto.latitude != null
                  ? new Prisma.Decimal(dto.latitude)
                  : null,
                longitude: dto.longitude != null
                  ? new Prisma.Decimal(dto.longitude)
                  : null,
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
      this.mapPrismaError(error);
    }
  }

  /* ================================================================
   * GET
   * ================================================================ */

  /**
   * Retourne la boutique du professionnel courant.
   */
  async getMyStore(ctx: AuthContext) {
    const professional = await this.loadProfessional(
      this.prisma,
      ctx.userId,
    );

    const store = await this.repository.findByProfessionalId(
      professional.id,
    );

    if (!store) {
      throw new StoreError(
        StoreErrorCode.STORE_NOT_FOUND,
        "Vous n'avez pas encore de boutique.",
      );
    }

    return store;
  }

  /**
   * Retourne une boutique publique par slug (uniquement si ACTIVE).
   */
  async getPublicBySlug(slug: string) {
    const store = await this.repository.findBySlug(slug);

    if (!store || store.status !== "ACTIVE") {
      throw new StoreError(
        StoreErrorCode.STORE_NOT_FOUND,
        "Boutique introuvable.",
      );
    }

    return store;
  }

  /**
   * Retourne une boutique par ID (avec ownership optionnel).
   */
  async getById(storeId: string, ctx?: AuthContext) {
    const store = await this.repository.findById(storeId);

    if (!store) {
      throw new StoreError(
        StoreErrorCode.STORE_NOT_FOUND,
        "Boutique introuvable.",
      );
    }

    /* Si ctx fourni, vérifier l'ownership */
    if (ctx && store.professional.userId !== ctx.userId) {
      /* Un client peut voir une boutique ACTIVE */
      if (store.status !== "ACTIVE") {
        throw new StoreError(
          StoreErrorCode.UNAUTHORIZED_STORE,
          "Boutique inaccessible.",
        );
      }
    }

    return store;
  }

  /**
   * Liste publique des boutiques ACTIVE.
   */
  async listActive(options?: { limit?: number; cursor?: string | null }) {
    const results = await this.repository.listActive(options);

    const limit = Math.min(options?.limit ?? 20, 100);
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

  async updateStore(
    storeId: string,
    dto: UpdateStoreDto,
    ctx: AuthContext,
  ) {
    try {
      return await this.withSerializableRetry(() =>
        this.prisma.$transaction(
          async (tx) => {
            const store = await this.loadAuthorizedStore(
              tx,
              storeId,
              ctx.userId,
            );

            if (store.status === "CLOSED") {
              throw new StoreError(
                StoreErrorCode.INVALID_STORE_STATE,
                "Impossible de modifier une boutique fermée.",
              );
            }

            if (dto.slug !== undefined && dto.slug !== store.slug) {
              await this.assertSlugFree(tx, dto.slug, storeId);
            }

            const data: Prisma.StoreUpdateInput = {};

            if (dto.name !== undefined) data.name = dto.name;
            if (dto.slug !== undefined) data.slug = dto.slug;
            if (dto.description !== undefined) {
              data.description = dto.description;
            }
            if (dto.logoKey !== undefined) data.logoKey = dto.logoKey;
            if (dto.bannerKey !== undefined) data.bannerKey = dto.bannerKey;
            if (dto.latitude !== undefined) {
              data.latitude = dto.latitude != null
                ? new Prisma.Decimal(dto.latitude)
                : null;
            }
            if (dto.longitude !== undefined) {
              data.longitude = dto.longitude != null
                ? new Prisma.Decimal(dto.longitude)
                : null;
            }

            return this.repository.update(storeId, data, tx);
          },
          {
            isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
            timeout: TRANSACTION_TIMEOUT_MS,
          },
        ),
      );
    } catch (error) {
      this.mapPrismaError(error);
    }
  }

  /* ================================================================
   * ACTIONS (transitions de statut)
   * ================================================================ */

  /**
   * Active une boutique.
   *
   * Règles :
   *  - Le pro doit être VERIFIED (KYC)
   *  - La boutique doit être en DRAFT ou SUSPENDED
   */
  async activateStore(storeId: string, ctx: AuthContext) {
  try {
    return await this.withSerializableRetry(() =>
      this.prisma.$transaction(
        async (tx) => {
          const store = await this.loadAuthorizedStore(
            tx,
            storeId,
            ctx.userId,
          );

          if (
            store.status !== "DRAFT" &&
            store.status !== "SUSPENDED"
          ) {
            throw new StoreError(
              StoreErrorCode.INVALID_STORE_STATE,
              `Impossible d'activer une boutique en statut ${store.status}.`,
            );
          }

          /* ⭐ PHASE 1 : Vérifier uniquement le téléphone confirmé */
          const professional = await tx.professionalProfile.findUnique({
            where: { id: store.professionalId },
            select: {
              verificationLevel: true,
              user: {
                select: { phoneVerifiedAt: true },
              },
            },
          });

          if (!professional?.user.phoneVerifiedAt) {
            throw new StoreError(
              StoreErrorCode.PROFESSIONAL_NOT_VERIFIED,
              "Confirmez votre numéro de téléphone pour activer votre boutique.",
            );
          }

          return this.repository.update(
            storeId,
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
    this.mapPrismaError(error);
  }
}

  /**
   * Suspend une boutique (admin uniquement).
   */
  async suspendStore(storeId: string, ctx: AuthContext) {
    /* Vérif rôle admin */
    if (ctx.role !== "ADMIN" && ctx.role !== "SUPER_ADMIN") {
      throw new StoreError(
        StoreErrorCode.UNAUTHORIZED,
        "Action réservée aux administrateurs.",
      );
    }

    try {
      return await this.withSerializableRetry(() =>
        this.prisma.$transaction(
          async (tx) => {
            const store = await this.repository.findById(storeId, tx);

            if (!store) {
              throw new StoreError(
                StoreErrorCode.STORE_NOT_FOUND,
                "Boutique introuvable.",
              );
            }

            if (store.status !== "ACTIVE") {
              throw new StoreError(
                StoreErrorCode.INVALID_STORE_STATE,
                `Impossible de suspendre une boutique en statut ${store.status}.`,
              );
            }

            return this.repository.update(
              storeId,
              { status: "SUSPENDED" },
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
      this.mapPrismaError(error);
    }
  }

  /**
   * Ferme une boutique (propriétaire ou admin).
   *
   * Règles :
   *  - Impossible s'il reste des produits
   */
  async closeStore(storeId: string, ctx: AuthContext) {
    try {
      return await this.withSerializableRetry(() =>
        this.prisma.$transaction(
          async (tx) => {
            const store = await this.loadAuthorizedStore(
              tx,
              storeId,
              ctx.userId,
            );

            if (store.status === "CLOSED") {
              return store;
            }

            /* Vérifier qu'il n'y a plus de produits */
            const productCount = await this.repository.countProducts(
              storeId,
              tx,
            );

            if (productCount > 0) {
              throw new StoreError(
                StoreErrorCode.STORE_HAS_PRODUCTS,
                `Impossible de fermer : ${productCount} produit(s) sont encore associés à cette boutique.`,
              );
            }

            return this.repository.update(
              storeId,
              { status: "CLOSED" },
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
      this.mapPrismaError(error);
    }
  }

  /* ================================================================
   * MAPPING ERREURS PRISMA
   * ================================================================ */

  private mapPrismaError(error: unknown): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        const target = Array.isArray(error.meta?.target)
          ? error.meta.target.join(",")
          : String(error.meta?.target ?? "");

        if (target.includes("slug")) {
          throw new StoreError(
            StoreErrorCode.STORE_SLUG_TAKEN,
            "Ce slug est déjà utilisé.",
          );
        }

        if (target.includes("professional_id")) {
          throw new StoreError(
            StoreErrorCode.STORE_ALREADY_EXISTS,
            "Vous avez déjà une boutique.",
          );
        }
      }
    }

    throw error;
  }
}