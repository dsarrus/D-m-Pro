// apps/api/src/modules/catalog/services/product-variant.service.ts

import { Prisma, PrismaClient } from "../../../generated/prisma/client";

import { ProductVariantRepository } from "../repositories/product-variant.repository";
import { CatalogError, CatalogErrorCode } from "../errors/catalog.error";
import { mapCatalogPrismaError } from "../errors/catalog-prisma.error";
import { IdempotencyService } from "./idempotency.service";

import type {
  CreateProductVariantDto,
  UpdateProductVariantDto,
} from "../dtos/productVariant.dto";

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

export class ProductVariantService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly variantRepository: ProductVariantRepository,
    private readonly idempotency: IdempotencyService,
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
   * Charge un produit + vérifie propriété + hasVariants + status.
   */
  private async loadAuthorizedProduct(
    db: Prisma.TransactionClient | PrismaClient,
    productId: string,
    userId: string,
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
        "Vous n'êtes pas autorisé à modifier ce produit.",
      );
    }

    if (!product.hasVariants) {
      throw new CatalogError(
        CatalogErrorCode.PRODUCT_HAS_NO_VARIANTS,
        "Ce produit n'est pas configuré pour utiliser des variantes.",
      );
    }

    if (product.status === "ARCHIVED") {
      throw new CatalogError(
        CatalogErrorCode.INVALID_PRODUCT_STATE,
        "Impossible de modifier les variantes d'un produit archivé.",
      );
    }

    return product;
  }

  /**
   * Charge une variante + vérifie propriété + hasVariants + status.
   */
  private async loadAuthorizedVariant(
    db: Prisma.TransactionClient | PrismaClient,
    variantId: string,
    userId: string,
  ) {
    const variant = await db.productVariant.findUnique({
      where: { id: variantId },
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

    if (!variant) {
      throw new CatalogError(
        CatalogErrorCode.PRODUCT_VARIANT_NOT_FOUND,
        "Variante introuvable.",
      );
    }

    if (variant.product.store.professional.userId !== userId) {
      throw new CatalogError(
        CatalogErrorCode.UNAUTHORIZED_STORE,
        "Vous n'êtes pas autorisé à modifier cette variante.",
      );
    }

    if (!variant.product.hasVariants) {
      throw new CatalogError(
        CatalogErrorCode.PRODUCT_HAS_NO_VARIANTS,
        "Ce produit n'est pas configuré pour utiliser des variantes.",
      );
    }

    if (variant.product.status === "ARCHIVED") {
      throw new CatalogError(
        CatalogErrorCode.INVALID_PRODUCT_STATE,
        "Impossible de modifier une variante d'un produit archivé.",
      );
    }

    return variant;
  }

  /**
   * Vérifie qu'un SKU n'est pas déjà utilisé.
   */
  private async assertSkuIsFree(
    db: Prisma.TransactionClient | PrismaClient,
    sku: string,
    excludeVariantId?: string,
  ): Promise<void> {
    const existing = await db.productVariant.findFirst({
      where: {
        sku,
        ...(excludeVariantId ? { NOT: { id: excludeVariantId } } : {}),
      },
      select: { id: true },
    });

    if (existing) {
      throw new CatalogError(
        CatalogErrorCode.DUPLICATE_SKU,
        `Le SKU "${sku}" est déjà utilisé.`,
      );
    }
  }

  /* ================================================================
   * CREATE
   * ================================================================ */

  /**
   * Crée une variante + son inventaire.
   *
   * Signature : `(productId, dto, ctx, idempotencyKey?)`
   *
   * La transaction Serializable garantit qu'aucune autre création
   * concurrente ne peut passer avec le même SKU.
   */
  async createVariant(
    productId: string,
    dto: CreateProductVariantDto,
    ctx: AuthContext,
    idempotencyKey?: string,
  ) {
    const endpoint = `POST /catalog/products/${productId}/variants`;
    const requestHash = idempotencyKey
      ? this.idempotency.hashRequest({
          userId: ctx.userId,
          endpoint,
          dto,
        })
      : null;

    if (idempotencyKey && requestHash) {
      const cached = await this.idempotency.acquire({
        key: idempotencyKey,
        scope: endpoint,
        userId: ctx.userId,
        requestHash,
      });

      if (cached) return cached.body;
    }

    try {
      const result = await this.withSerializableRetry(() =>
        this.prisma.$transaction(
          async (tx) => {
            const product = await this.loadAuthorizedProduct(
              tx,
              productId,
              ctx.userId,
            );

            if (dto.sku) {
              await this.assertSkuIsFree(tx, dto.sku);
            }

            const variant = await tx.productVariant.create({
              data: {
                product: { connect: { id: productId } },
                name: dto.name,
                sku: dto.sku ?? null,
                price: new Prisma.Decimal(dto.price),
                currency: dto.currency,
                attributes: dto.attributes ?? undefined,
                isActive: dto.isActive,
              },
            });

            const inventory = await tx.inventory.create({
              data: {
                variant: { connect: { id: variant.id } },
                quantity: dto.inventory,
                reserved: 0,
              },
            });

            return { variant, inventory, product };
          },
          {
            isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
            timeout: TRANSACTION_TIMEOUT_MS,
          },
        ),
      );

      if (idempotencyKey) {
        await this.idempotency.complete(idempotencyKey, endpoint, {
          statusCode: 201,
          body: result,
        });
      }

      return result;
    } catch (error) {
      if (idempotencyKey) {
        await this.idempotency.fail(idempotencyKey, endpoint);
      }
      mapCatalogPrismaError(error);
    }
  }

  /* ================================================================
   * UPDATE
   * ================================================================ */

  async updateVariant(
    variantId: string,
    dto: UpdateProductVariantDto,
    ctx: AuthContext,
  ) {
    try {
      return await this.withSerializableRetry(() =>
        this.prisma.$transaction(
          async (tx) => {
            const variant = await this.loadAuthorizedVariant(
              tx,
              variantId,
              ctx.userId,
            );

            if (dto.sku !== undefined && dto.sku !== variant.sku) {
              if (dto.sku) {
                await this.assertSkuIsFree(tx, dto.sku, variantId);
              }
            }

            const data: Prisma.ProductVariantUpdateInput = {};

            if (dto.name !== undefined) data.name = dto.name;
            if (dto.sku !== undefined) data.sku = dto.sku;
            if (dto.currency !== undefined) data.currency = dto.currency;
            if (dto.attributes !== undefined) {
              data.attributes = dto.attributes ?? Prisma.DbNull;
            }
            if (dto.isActive !== undefined) data.isActive = dto.isActive;
            if (dto.price !== undefined) {
              data.price = new Prisma.Decimal(dto.price);
            }

            return tx.productVariant.update({
              where: { id: variantId },
              data,
              include: { inventory: true },
            });
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

  async getVariant(variantId: string) {
    const variant = await this.variantRepository.findById(variantId);

    if (!variant) {
      throw new CatalogError(
        CatalogErrorCode.PRODUCT_VARIANT_NOT_FOUND,
        "Variante introuvable.",
      );
    }

    return variant;
  }

  async listByProduct(productId: string, ctx: AuthContext) {
    await this.loadAuthorizedProduct(this.prisma, productId, ctx.userId);

    return this.variantRepository.findByProductId(productId);
  }

  /* ================================================================
   * DELETE
   * ================================================================ */

  /**
   * Supprime une variante.
   *
   * Refusé si :
   *  - produit archivé
   *  - réservations actives sur l'inventaire lié
   */
  async deleteVariant(variantId: string, ctx: AuthContext) {
    try {
      return await this.withSerializableRetry(() =>
        this.prisma.$transaction(
          async (tx) => {
            const variant = await this.loadAuthorizedVariant(
              tx,
              variantId,
              ctx.userId,
            );

            /* ----- Protection des réservations ----- */
            const inventory = await tx.inventory.findUnique({
              where: { variantId },
            });

            if (inventory && inventory.reserved > 0) {
              throw new CatalogError(
                CatalogErrorCode.INVALID_INVENTORY_QUANTITY,
                "Impossible de supprimer : des réservations sont actives sur cette variante.",
              );
            }

            const activeVariantCount = await tx.productVariant.count({
              where: {
                productId: variant.productId,
                isActive: true,
              },
            });

            const deleted = await tx.productVariant.delete({
              where: { id: variantId },
            });

            return {
              variant: deleted,
              remainingActiveVariants: Math.max(
                activeVariantCount - (variant.isActive ? 1 : 0),
                0,
              ),
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
   * ACTIVATE / DEACTIVATE
   * ================================================================ */

  async activateVariant(variantId: string, ctx: AuthContext) {
    try {
      return await this.withSerializableRetry(() =>
        this.prisma.$transaction(
          async (tx) => {
            await this.loadAuthorizedVariant(tx, variantId, ctx.userId);

            return tx.productVariant.update({
              where: { id: variantId },
              data: { isActive: true },
              include: { inventory: true },
            });
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

  async deactivateVariant(variantId: string, ctx: AuthContext) {
    try {
      return await this.withSerializableRetry(() =>
        this.prisma.$transaction(
          async (tx) => {
            const variant = await this.loadAuthorizedVariant(
              tx,
              variantId,
              ctx.userId,
            );

            const activeCount = await tx.productVariant.count({
              where: {
                productId: variant.productId,
                isActive: true,
              },
            });

            if (variant.isActive && activeCount <= 1) {
              throw new CatalogError(
                CatalogErrorCode.LAST_ACTIVE_VARIANT,
                "Impossible de désactiver la dernière variante active du produit.",
              );
            }

            return tx.productVariant.update({
              where: { id: variantId },
              data: { isActive: false },
              include: { inventory: true },
            });
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
