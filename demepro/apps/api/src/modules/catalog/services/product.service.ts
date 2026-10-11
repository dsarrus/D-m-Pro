/**
 * apps/api/src/modules/catalog/services/product.service.ts
 *
 * Service principal du domaine Produit.
 *
 * Responsabilités :
 *  - création simple (produit nu)
 *  - création atomique complète (Product + Images + Variants + Inventories)
 *  - mise à jour, activation, archivage, suppression
 *  - bascule hasVariants (enable / disable)
 *  - listing par boutique
 *
 * Garanties :
 *  - toutes les opérations sensibles sont transactionnelles
 *  - isolation Serializable + retry sur conflit P2034
 *  - unicité slug (par store) et SKU (global) protégée à 2 niveaux
 *  - idempotence optionnelle via header Idempotency-Key
 */

import { Prisma, PrismaClient } from "../../../generated/prisma/client";

import { CatalogError, CatalogErrorCode } from "../errors/catalog.error";

import { mapCatalogPrismaError } from "../errors/catalog-prisma.error";

import { ProductRepository } from "../repositories/product.repository";
import { IdempotencyService } from "./idempotency.service";

import type {
  CreateProductDto,
  CreateProductWithRelationsDto,
  UpdateProductDto,
} from "../dto/product.dto";

/* ================================================================
 * CONSTANTES
 * ================================================================ */

const SERIALIZABLE_MAX_ATTEMPTS = 3;
const TRANSACTION_TIMEOUT_MS = 15000;

/* ================================================================
 * TYPES
 * ================================================================ */

export type AuthContext = {
  userId: string;
  permissions?: string[];
};

export type ProductStatus =
  "DRAFT" | "ACTIVE" | "OUT_OF_STOCK" | "INACTIVE" | "ARCHIVED";

export type ListByStoreOptions = {
  limit?: number;
  cursor?: string | null;
  status?: ProductStatus;
};

/* ================================================================
 * SERVICE
 * ================================================================ */

export class ProductService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly repository: ProductRepository,
    private readonly idempotency: IdempotencyService,
  ) {}

  /* ================================================================
   * HELPERS PRIVÉS
   * ================================================================ */

  /**
   * Retry avec backoff exponentiel + jitter pour les conflits
   * de sérialisation PostgreSQL (P2034 / SQLSTATE 40001).
   */
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
   * Charge un produit avec ses relations minimales pour
   * l'autorisation (store → professional → userId).
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
            professional: {
              select: { userId: true },
            },
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

    return product;
  }

  /**
   * Vérifie qu'aucun SKU fourni n'est déjà utilisé globalement.
   * La contrainte @unique PostgreSQL reste la seconde barrière.
   */
  private async assertSkusAreFree(
    db: Prisma.TransactionClient | PrismaClient,
    skus: string[],
  ): Promise<void> {
    if (skus.length === 0) return;

    const conflicting = await db.productVariant.findFirst({
      where: { sku: { in: skus } },
      select: { sku: true },
    });

    if (conflicting) {
      throw new CatalogError(
        CatalogErrorCode.DUPLICATE_SKU,
        `Le SKU "${conflicting.sku}" est déjà utilisé.`,
      );
    }
  }

  /**
   * Vérifie l'unicité d'un slug dans une boutique.
   */
  private async assertSlugIsFree(
    db: Prisma.TransactionClient | PrismaClient,
    storeId: string,
    slug: string,
    excludeProductId?: string,
  ): Promise<void> {
    const existing = await db.product.findFirst({
      where: {
        storeId,
        slug,
        ...(excludeProductId ? { NOT: { id: excludeProductId } } : {}),
      },
      select: { id: true },
    });

    if (existing) {
      throw new CatalogError(
        CatalogErrorCode.DUPLICATE_SLUG,
        `Le slug "${slug}" est déjà utilisé dans cette boutique.`,
      );
    }
  }

  /**
   * Vérifie qu'une catégorie existe.
   */
  private async assertCategoryExists(
    db: Prisma.TransactionClient | PrismaClient,
    categoryId: string,
  ): Promise<void> {
    const category = await db.category.findUnique({
      where: { id: categoryId },
      select: { id: true },
    });

    if (!category) {
      throw new CatalogError(
        CatalogErrorCode.CATEGORY_NOT_FOUND,
        "Catégorie introuvable.",
      );
    }
  }

  /**
   * Charge la boutique et vérifie la propriété.
   */
  private async loadAuthorizedStore(
    db: Prisma.TransactionClient | PrismaClient,
    storeId: string,
    userId: string,
  ) {
    const store = await db.store.findUnique({
      where: { id: storeId },
      include: {
        professional: {
          select: { userId: true },
        },
      },
    });

    if (!store) {
      throw new CatalogError(
        CatalogErrorCode.STORE_NOT_FOUND,
        "Boutique introuvable.",
      );
    }

    if (store.professional.userId !== userId) {
      throw new CatalogError(
        CatalogErrorCode.UNAUTHORIZED_STORE,
        "Vous n'êtes pas autorisé à agir sur cette boutique.",
      );
    }

    return store;
  }

  /* ================================================================
   * CREATE — produit nu
   * ================================================================ */

  /**
   * Crée un produit sans variants, sans images, sans stock.
   *
   * Endpoint : POST /catalog/products
   */
  async createProduct(
    dto: CreateProductDto,
    ctx: AuthContext,
    idempotencyKey?: string,
  ) {
    const endpoint = "POST /catalog/products";
    const idempotencyScope = endpoint;
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
        scope: idempotencyScope,
        userId: ctx.userId,
        requestHash,
      });

      if (cached) return cached.body;
    }

    try {
      const result = await this.withSerializableRetry(() =>
        this.prisma.$transaction(
          async (tx) => {
            /* 1. Store + propriétaire */
            await this.loadAuthorizedStore(tx, dto.storeId, ctx.userId);

            /* 2. Catégorie */
            if (dto.categoryId) {
              await this.assertCategoryExists(tx, dto.categoryId);
            }

            /* 3. Slug unique */
            await this.assertSlugIsFree(tx, dto.storeId, dto.slug);

            /* 4. SKU unique (si fourni) */
            if (dto.sku) {
              await this.assertSkusAreFree(tx, [dto.sku]);
            }

            /* 5. INSERT Product */
            const product = await tx.product.create({
              data: {
                store: { connect: { id: dto.storeId } },
                category: { connect: { id: dto.categoryId } },
                name: dto.name,
                slug: dto.slug,
                description: dto.description ?? null,
                sku: dto.sku ?? null,
                status: dto.status,
                hasVariants: dto.hasVariants,

                price:
                  dto.hasVariants || dto.price == null
                    ? null
                    : new Prisma.Decimal(dto.price),

                currency: dto.currency,
              },
            });

            return { product };
          },
          {
            isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
            timeout: TRANSACTION_TIMEOUT_MS,
          },
        ),
      );

      const idempotencyScope = `POST /catalog/products`;

      if (idempotencyKey) {
        await this.idempotency.complete(idempotencyKey, idempotencyScope, {
          statusCode: 201,
          body: result,
        });
      }

      return result;
    } catch (error) {
      if (idempotencyKey) {
        await this.idempotency.fail(idempotencyKey, idempotencyScope);
      }
      mapCatalogPrismaError(error);
    }
  }

  /* ================================================================
   * CREATE FULL — atomique
   * ================================================================ */

  /**
   * Crée un produit complet dans une seule transaction :
   * Product + Images + Variants + Inventories.
   *
   * Endpoint : POST /catalog/products/full
   */
  async createFull(
    dto: CreateProductWithRelationsDto,
    ctx: AuthContext,
    idempotencyKey?: string,
  ) {
    const endpoint = "POST /catalog/products/full";
    const idempotencyScope = endpoint;
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
        scope: idempotencyScope,
        userId: ctx.userId,
        requestHash,
      });

      if (cached) return cached.body;
    }

    try {
      const result = await this.withSerializableRetry(() =>
        this.prisma.$transaction(
          async (tx) => {
            /* 1. Store + propriétaire */
            await this.loadAuthorizedStore(tx, dto.storeId, ctx.userId);

            /* 2. Catégorie */
            if (dto.categoryId) {
              await this.assertCategoryExists(tx, dto.categoryId);
            }

            /* 3. Slug unique */
            await this.assertSlugIsFree(tx, dto.storeId, dto.slug);

            /* 4. SKU global unique */
            const allSkus: string[] = [];
            if (dto.sku) allSkus.push(dto.sku);
            if (dto.hasVariants && dto.variants) {
              for (const v of dto.variants) {
                if (v.sku) allSkus.push(v.sku);
              }
            }
            await this.assertSkusAreFree(tx, allSkus);

            /* 5. INSERT Product */
            const product = await tx.product.create({
              data: {
                store: { connect: { id: dto.storeId } },
                category: { connect: { id: dto.categoryId } },

                name: dto.name,
                slug: dto.slug,
                description: dto.description ?? null,
                sku: dto.sku ?? null,
                status: dto.status,
                hasVariants: dto.hasVariants,

                price:
                  dto.hasVariants || dto.price == null
                    ? null
                    : new Prisma.Decimal(dto.price),

                currency: dto.currency,
              },
            });

            /* 6. INSERT Images */
            let images: Awaited<ReturnType<typeof tx.productImage.create>>[] =
              [];

            if (dto.images && dto.images.length > 0) {
              let primaryAssigned = false;

              const imageData = dto.images.map((img) => {
                const isPrimary = Boolean(img.isPrimary) && !primaryAssigned;
                if (isPrimary) primaryAssigned = true;

                return {
                  productId: product.id,
                  objectKey: img.objectKey,
                  altText: img.altText ?? null,
                  sortOrder: img.sortOrder ?? 0,
                  isPrimary,
                };
              });

              await tx.productImage.createMany({ data: imageData });

              images = await tx.productImage.findMany({
                where: { productId: product.id },
                orderBy: [
                  { isPrimary: "desc" },
                  { sortOrder: "asc" },
                  { createdAt: "asc" },
                ],
              });
            }

            /* 7. Produit SIMPLE → Inventory direct */
            if (!dto.hasVariants) {
              const inventory = await tx.inventory.create({
                data: {
                  productId: product.id,
                  quantity: dto.inventory ?? 0,
                  reserved: 0,
                },
              });

              return {
                product: {
                  ...product,
                  images,
                  inventory,
                  variants: [],
                },
              };
            }

            /* 8. Produit À VARIANTES → Variants + Inventories */
            const createdVariants: Array<
              Awaited<ReturnType<typeof tx.productVariant.create>> & {
                inventory: Awaited<ReturnType<typeof tx.inventory.create>>;
              }
            > = [];

            for (const variantDto of dto.variants ?? []) {
              const variant = await tx.productVariant.create({
                data: {
                  productId: product.id,
                  name: variantDto.name,
                  sku: variantDto.sku ?? null,
                  price: new Prisma.Decimal(variantDto.price),
                  currency: variantDto.currency ?? dto.currency,
                  attributes: variantDto.attributes ?? undefined,
                  isActive: variantDto.isActive ?? true,
                },
              });

              const inventory = await tx.inventory.create({
                data: {
                  variantId: variant.id,
                  quantity: variantDto.inventory ?? 0,
                  reserved: 0,
                },
              });

              createdVariants.push({
                ...variant,
                inventory,
              });
            }

            return {
              product: {
                ...product,
                images,
                inventory: null,
                variants: createdVariants,
              },
            };
          },
          {
            isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
            timeout: TRANSACTION_TIMEOUT_MS,
          },
        ),
      );

      const idempotencyScope = `POST /catalog/products/full`;

      if (idempotencyKey) {
        await this.idempotency.complete(idempotencyKey, idempotencyScope, {
          statusCode: 201,
          body: result,
        });
      }

      return result;
    } catch (error) {
      if (idempotencyKey) {
        await this.idempotency.fail(idempotencyKey, idempotencyScope);
      }
      mapCatalogPrismaError(error);
    }
  }

  /* ================================================================
   * GET
   * ================================================================ */

  async getProduct(productId: string) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      include: {
        images: {
          orderBy: [
            { isPrimary: "desc" },
            { sortOrder: "asc" },
            { createdAt: "asc" },
          ],
        },
        variants: {
          include: { inventory: true },
          orderBy: { createdAt: "asc" },
        },
        inventory: true,
        category: true,
        store: {
          select: {
            id: true,
            name: true,
            slug: true,
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

    return product;
  }

  /* ================================================================
   * LIST BY STORE
   * ================================================================ */

  /**
   * Liste paginée par curseur (createdAt desc).
   */
  async listByStore(
    storeId: string,
    ctx: AuthContext,
    options?: ListByStoreOptions,
  ) {
    await this.loadAuthorizedStore(this.prisma, storeId, ctx.userId);

    const limit = Math.min(options?.limit ?? 20, 100);

    return this.prisma.product.findMany({
      where: {
        storeId,
        ...(options?.status ? { status: options.status } : {}),
      },
      include: {
        images: {
          where: { isPrimary: true },
          take: 1,
        },
        _count: {
          select: { variants: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: limit + 1,
      ...(options?.cursor
        ? {
            cursor: { id: options.cursor },
            skip: 1,
          }
        : {}),
    });
  }

  /* ================================================================
   * UPDATE
   * ================================================================ */

  /**
   * Met à jour un produit.
   *
   * hasVariants n'est PAS modifiable ici.
   * Utiliser enableVariants / disableVariants.
   */
  async updateProduct(
    productId: string,
    dto: UpdateProductDto,
    ctx: AuthContext,
  ) {
    try {
      return await this.withSerializableRetry(() =>
        this.prisma.$transaction(
          async (tx) => {
            const product = await this.loadAuthorizedProduct(
              tx,
              productId,
              ctx.userId,
            );

            if (product.status === "ARCHIVED") {
              throw new CatalogError(
                CatalogErrorCode.INVALID_PRODUCT_STATE,
                "Impossible de modifier un produit archivé.",
              );
            }

            /* Slug */
            if (dto.slug !== undefined && dto.slug !== product.slug) {
              await this.assertSlugIsFree(
                tx,
                product.storeId,
                dto.slug,
                productId,
              );
            }

            /* SKU */
            if (dto.sku !== undefined && dto.sku !== product.sku) {
              if (dto.sku) {
                await this.assertSkusAreFree(tx, [dto.sku]);
              }
            }

            /* Catégorie */
            if (dto.categoryId !== undefined) {
              await this.assertCategoryExists(tx, dto.categoryId);
            }

            /* Cohérence price / hasVariants */
            const effectivePrice =
              dto.price !== undefined ? dto.price : product.price;

            if (!product.hasVariants && effectivePrice == null) {
              throw new CatalogError(
                CatalogErrorCode.INVALID_PRODUCT_STATE,
                "Un produit sans variantes doit conserver un prix.",
              );
            }

            if (product.hasVariants && effectivePrice != null) {
              throw new CatalogError(
                CatalogErrorCode.INVALID_PRODUCT_STATE,
                "Un produit avec variantes ne doit pas avoir de prix direct.",
              );
            }

            /* Patch */
            const data: Prisma.ProductUpdateInput = {};

            if (dto.categoryId !== undefined) {
              data.category = { connect: { id: dto.categoryId } };
            }
            if (dto.name !== undefined) data.name = dto.name;
            if (dto.slug !== undefined) data.slug = dto.slug;
            if (dto.description !== undefined) {
              data.description = dto.description;
            }
            if (dto.sku !== undefined) data.sku = dto.sku;
            if (dto.status !== undefined) data.status = dto.status;
            if (dto.currency !== undefined) data.currency = dto.currency;

            if (dto.price !== undefined) {
              data.price =
                dto.price == null ? null : new Prisma.Decimal(dto.price);
            }

            return tx.product.update({
              where: { id: productId },
              data,
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
   * ENABLE / DISABLE VARIANTS
   * ================================================================ */

  /**
   * Active le mode "produit à variantes".
   * Le prix direct est mis à null.
   */
  async enableVariants(productId: string, ctx: AuthContext) {
    try {
      return await this.withSerializableRetry(() =>
        this.prisma.$transaction(
          async (tx) => {
            const product = await this.loadAuthorizedProduct(
              tx,
              productId,
              ctx.userId,
            );

            if (product.status === "ARCHIVED") {
              throw new CatalogError(
                CatalogErrorCode.INVALID_PRODUCT_STATE,
                "Impossible de modifier un produit archivé.",
              );
            }

            if (product.hasVariants) {
              return product;
            }

            return tx.product.update({
              where: { id: productId },
              data: {
                hasVariants: true,
                price: null,
              },
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

  /**
   * Désactive le mode "produit à variantes".
   * Refusé tant qu'il existe au moins une variante.
   * Le prix direct doit être fourni.
   */
  async disableVariants(
    productId: string,
    price: number | string,
    ctx: AuthContext,
  ) {
    try {
      return await this.withSerializableRetry(() =>
        this.prisma.$transaction(
          async (tx) => {
            const product = await this.loadAuthorizedProduct(
              tx,
              productId,
              ctx.userId,
            );

            if (product.status === "ARCHIVED") {
              throw new CatalogError(
                CatalogErrorCode.INVALID_PRODUCT_STATE,
                "Impossible de modifier un produit archivé.",
              );
            }

            if (!product.hasVariants) {
              return product;
            }

            const variantCount = await tx.productVariant.count({
              where: { productId },
            });

            if (variantCount > 0) {
              throw new CatalogError(
                CatalogErrorCode.VARIANTS_EXIST,
                "Impossible de désactiver les variantes tant qu'il en existe.",
              );
            }

            return tx.product.update({
              where: { id: productId },
              data: {
                hasVariants: false,
                price: new Prisma.Decimal(price),
              },
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
   * ACTIVATE
   * ================================================================ */

  /**
   * Active un produit.
   *
   * Règles :
   *  - produit non archivé
   *  - produit simple : inventory.quantity > 0
   *  - produit à variantes : au moins une variante active avec stock
   */
  async activateProduct(productId: string, ctx: AuthContext) {
    try {
      return await this.withSerializableRetry(() =>
        this.prisma.$transaction(
          async (tx) => {
            const product = await this.loadAuthorizedProduct(
              tx,
              productId,
              ctx.userId,
            );

            if (product.status === "ARCHIVED") {
              throw new CatalogError(
                CatalogErrorCode.INVALID_PRODUCT_STATE,
                "Impossible d'activer un produit archivé.",
              );
            }

            if (!product.hasVariants) {
              const inventory = await tx.inventory.findUnique({
                where: { productId },
              });

              if (!inventory || inventory.quantity <= 0) {
                throw new CatalogError(
                  CatalogErrorCode.INVALID_PRODUCT_STATE,
                  "Impossible d'activer : aucun stock disponible.",
                );
              }
            } else {
              const activeVariantsWithStock = await tx.productVariant.count({
                where: {
                  productId,
                  isActive: true,
                  inventory: {
                    quantity: { gt: 0 },
                  },
                },
              });

              if (activeVariantsWithStock === 0) {
                throw new CatalogError(
                  CatalogErrorCode.INVALID_PRODUCT_STATE,
                  "Impossible d'activer : aucune variante active avec stock.",
                );
              }
            }

            return tx.product.update({
              where: { id: productId },
              data: { status: "ACTIVE" },
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
   * ARCHIVE
   * ================================================================ */

  /**
   * Archive un produit.
   * Désactive toutes ses variantes. Ne supprime rien.
   */
  async archiveProduct(productId: string, ctx: AuthContext) {
    try {
      return await this.withSerializableRetry(() =>
        this.prisma.$transaction(
          async (tx) => {
            const product = await this.loadAuthorizedProduct(
              tx,
              productId,
              ctx.userId,
            );

            if (product.status === "ARCHIVED") {
              return product;
            }

            await tx.productVariant.updateMany({
              where: { productId },
              data: { isActive: false },
            });

            return tx.product.update({
              where: { id: productId },
              data: { status: "ARCHIVED" },
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
   * DELETE — hard
   * ================================================================ */

  /**
   * Supprime définitivement un produit.
   * Refusé si des réservations de stock sont actives.
   * Les cascades Prisma gèrent variants / images / inventories.
   */
  async deleteProduct(productId: string, ctx: AuthContext) {
    try {
      return await this.withSerializableRetry(() =>
        this.prisma.$transaction(
          async (tx) => {
            await this.loadAuthorizedProduct(tx, productId, ctx.userId);

            /* Vérifier réservations produit simple */
            const productInventory = await tx.inventory.findUnique({
              where: { productId },
            });

            if (productInventory && productInventory.reserved > 0) {
              throw new CatalogError(
                CatalogErrorCode.INVALID_INVENTORY_QUANTITY,
                "Impossible de supprimer : des réservations sont actives sur ce produit.",
              );
            }

            /* Vérifier réservations variants */
            const variantInventories = await tx.inventory.findMany({
              where: {
                variant: { productId },
              },
            });

            const hasReservations = variantInventories.some(
              (inv) => inv.reserved > 0,
            );

            if (hasReservations) {
              throw new CatalogError(
                CatalogErrorCode.INVALID_INVENTORY_QUANTITY,
                "Impossible de supprimer : des réservations sont actives sur une variante.",
              );
            }

            await tx.product.delete({
              where: { id: productId },
            });

            return { id: productId };
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
