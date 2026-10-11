// apps/api/src/modules/catalog/services/product-image.service.ts

import { Prisma, PrismaClient } from "../../../generated/prisma/client";

import { ProductImageRepository } from "../repositories/product-image.repository";
import { CatalogError, CatalogErrorCode } from "../errors/catalog.error";
import { mapCatalogPrismaError } from "../errors/catalog-prisma.error";

import type {
  CreateProductImageDto,
  UpdateProductImageDto,
} from "../dto/product-image.dto";

/* ================================================================
 * TYPES
 * ================================================================ */

export type AuthContext = {
  userId: string;
  permissions?: string[];
};

const SERIALIZABLE_MAX_ATTEMPTS = 3;
const TRANSACTION_TIMEOUT_MS = 15000;

/* ================================================================
 * SERVICE
 * ================================================================ */

export class ProductImageService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly imageRepository: ProductImageRepository,
  ) {}

  /* ================================================================
   * HELPERS PRIVÉS
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
          Math.min(100 * 2 ** attempt, 2000) + Math.floor(Math.random() * 100);

        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  /**
   * Charge un produit + vérifie propriété + status non archivé.
   * Note : on autorise l'usage de cette méthode pour la lecture
   * (listByProduct) ; le contrôle d'archivage est à la charge
   * de l'appelant pour les écritures.
   */
  private async loadAuthorizedProduct(
    db: Prisma.TransactionClient | PrismaClient,
    productId: string,
    userId: string,
    options?: { rejectIfArchived?: boolean },
  ) {
    const product = await db.product.findUnique({
      where: { id: productId },
      include: {
        store: {
          include: {
            professional: { select: { userId: true } },
          },
        },
      },
    });

    if (!product) {
      throw new CatalogError(
        CatalogErrorCode.PRODUCT_NOT_FOUND,
        "Produit introuvable.",
      );
    }

    if (product.store.professional.userId !== userId) {
      throw new CatalogError(
        CatalogErrorCode.UNAUTHORIZED_STORE,
        "Vous n'êtes pas autorisé à modifier les images de ce produit.",
      );
    }

    if (options?.rejectIfArchived && product.status === "ARCHIVED") {
      throw new CatalogError(
        CatalogErrorCode.INVALID_PRODUCT_STATE,
        "Impossible de modifier les images d'un produit archivé.",
      );
    }

    return product;
  }

  /**
   * Charge une image + vérifie propriété + status non archivé.
   */
  private async loadAuthorizedImage(
    db: Prisma.TransactionClient | PrismaClient,
    imageId: string,
    userId: string,
  ) {
    const image = await db.productImage.findUnique({
      where: { id: imageId },
      include: {
        product: {
          include: {
            store: {
              include: {
                professional: { select: { userId: true } },
              },
            },
          },
        },
      },
    });

    if (!image) {
      throw new CatalogError(
        CatalogErrorCode.PRODUCT_IMAGE_NOT_FOUND,
        "Image introuvable.",
      );
    }

    if (image.product.store.professional.userId !== userId) {
      throw new CatalogError(
        CatalogErrorCode.UNAUTHORIZED_STORE,
        "Vous n'êtes pas autorisé à modifier cette image.",
      );
    }

    if (image.product.status === "ARCHIVED") {
      throw new CatalogError(
        CatalogErrorCode.INVALID_PRODUCT_STATE,
        "Impossible de modifier une image d'un produit archivé.",
      );
    }

    return image;
  }

  /* ================================================================
   * CREATE
   * ================================================================ */

  /**
   * Crée une image.
   *
   * Règles métier :
   *  - au plus une image `isPrimary = true` par produit
   *  - si c'est la **première image** du produit, elle devient
   *    automatiquement primaire, même si `dto.isPrimary = false`
   *  - si `dto.isPrimary = true`, on démarque l'ancienne primaire
   */
  async createImage(
    productId: string,
    dto: CreateProductImageDto,
    ctx: AuthContext,
  ) {
    try {
      return await this.withSerializableRetry(() =>
        this.prisma.$transaction(
          async (tx) => {
            await this.loadAuthorizedProduct(tx, productId, ctx.userId, {
              rejectIfArchived: true,
            });

            const existingCount = await this.imageRepository.countByProductId(
              productId,
              tx,
            );

            const shouldBePrimary = dto.isPrimary || existingCount === 0;

            if (shouldBePrimary) {
              await this.imageRepository.unsetPrimary(productId, tx);
            }

            return this.imageRepository.create(
              {
                product: { connect: { id: productId } },
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
      mapCatalogPrismaError(error);
    }
  }

  /* ================================================================
   * UPDATE
   * ================================================================ */

  /**
   * Met à jour une image.
   *
   * Règles métier :
   *  - si `isPrimary = true`, on démarque l'ancienne primaire
   *  - si `isPrimary = false` sur l'image primaire actuelle,
   *    on promeut automatiquement la suivante ; s'il n'y a pas
   *    de suivante, on refuse (le produit ne peut pas rester
   *    sans image primaire s'il a au moins une image)
   */
  async updateImage(
    imageId: string,
    dto: UpdateProductImageDto,
    ctx: AuthContext,
  ) {
    try {
      return await this.withSerializableRetry(() =>
        this.prisma.$transaction(
          async (tx) => {
            const image = await this.loadAuthorizedImage(
              tx,
              imageId,
              ctx.userId,
            );

            /* ----- Promotion en primaire ----- */
            if (dto.isPrimary === true && !image.isPrimary) {
              await this.imageRepository.unsetPrimary(image.productId, tx);
            }

            /* ----- Retrait du statut primaire ----- */
            if (dto.isPrimary === false && image.isPrimary) {
              const candidate = await this.imageRepository.findNextCandidate(
                image.productId,
                imageId,
                tx,
              );

              if (!candidate) {
                throw new CatalogError(
                  CatalogErrorCode.INVALID_PRODUCT_STATE,
                  "Impossible de retirer le statut primaire : aucune autre image disponible.",
                );
              }

              await this.imageRepository.setPrimary(candidate.id, tx);
            }

            const data: Prisma.ProductImageUpdateInput = {};

            if (dto.objectKey !== undefined) data.objectKey = dto.objectKey;
            if (dto.altText !== undefined) {
              data.altText = dto.altText ?? null;
            }
            if (dto.sortOrder !== undefined) data.sortOrder = dto.sortOrder;
            if (dto.isPrimary !== undefined) data.isPrimary = dto.isPrimary;

            return this.imageRepository.update(imageId, data, tx);
          },
          {
            isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
            timeout: TRANSACTION_TIMEOUT_MS,
          },
        ),
      );
    } catch (error) {
      mapCatalogPrismaError(error);
    }
  }

  /* ================================================================
   * DELETE
   * ================================================================ */

  /**
   * Supprime une image.
   *
   * Si l'image supprimée était primaire, la première image restante
   * est automatiquement promue en primaire.
   */
  async deleteImage(imageId: string, ctx: AuthContext) {
    try {
      return await this.withSerializableRetry(() =>
        this.prisma.$transaction(
          async (tx) => {
            const image = await this.loadAuthorizedImage(
              tx,
              imageId,
              ctx.userId,
            );

            const wasPrimary = image.isPrimary;

            await this.imageRepository.delete(imageId, tx);

            let promoted: { id: string } | null = null;

            if (wasPrimary) {
              const candidate = await this.imageRepository.findNextCandidate(
                image.productId,
                undefined,
                tx,
              );

              if (candidate) {
                await this.imageRepository.setPrimary(candidate.id, tx);
                promoted = { id: candidate.id };
              }
            }

            return {
              deletedId: imageId,
              promotedPrimary: promoted,
            };
          },
          {
            isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
            timeout: TRANSACTION_TIMEOUT_MS,
          },
        ),
      );
    } catch (error) {
      mapCatalogPrismaError(error);
    }
  }

  /* ================================================================
   * GET / LIST
   * ================================================================ */

  async getImage(imageId: string) {
    const image = await this.imageRepository.findById(imageId);

    if (!image) {
      throw new CatalogError(
        CatalogErrorCode.PRODUCT_IMAGE_NOT_FOUND,
        "Image introuvable.",
      );
    }

    return image;
  }

  async listByProduct(productId: string, ctx: AuthContext) {
    await this.loadAuthorizedProduct(this.prisma, productId, ctx.userId);

    return this.imageRepository.findByProductId(productId);
  }

  /* ================================================================
   * REORDER
   * ================================================================ */

  /**
   * Réordonne les images d'un produit.
   *
   * Reçoit une liste d'`imageId` dans l'ordre voulu.
   * Met à jour `sortOrder` en conséquence (0, 1, 2, ...).
   * Toutes les images du produit doivent être incluses.
   */
  async reorderImages(
    productId: string,
    orderedImageIds: string[],
    ctx: AuthContext,
  ) {
    try {
      return await this.withSerializableRetry(() =>
        this.prisma.$transaction(
          async (tx) => {
            await this.loadAuthorizedProduct(tx, productId, ctx.userId, {
              rejectIfArchived: true,
            });

            const existing = await tx.productImage.findMany({
              where: { productId },
              select: { id: true },
            });

            const existingIds = new Set(existing.map((i) => i.id));

            for (const id of orderedImageIds) {
              if (!existingIds.has(id)) {
                throw new CatalogError(
                  CatalogErrorCode.PRODUCT_IMAGE_NOT_FOUND,
                  `Image ${id} introuvable pour ce produit.`,
                );
              }
            }

            if (orderedImageIds.length !== existing.length) {
              throw new CatalogError(
                CatalogErrorCode.INVALID_PRODUCT_STATE,
                "La liste doit contenir toutes les images du produit.",
              );
            }

            for (let i = 0; i < orderedImageIds.length; i++) {
              await tx.productImage.update({
                where: { id: orderedImageIds[i] },
                data: { sortOrder: i },
              });
            }

            return this.imageRepository.findByProductId(productId, tx);
          },
          {
            isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
            timeout: TRANSACTION_TIMEOUT_MS,
          },
        ),
      );
    } catch (error) {
      mapCatalogPrismaError(error);
    }
  }
}
