// apps/api/src/modules/order/services/order.service.ts

import { Prisma, PrismaClient } from "../../../generated/prisma/client";

import { OrderRepository } from "../repositories/order.repository";
import { OrderError, OrderErrorCode } from "../errors/order-error";

import { InventoryService } from "../../catalog/services/inventory.service";
import {
  CatalogError,
  CatalogErrorCode,
} from "../../catalog/errors/catalog.error";

import type {
  CreateOrderDto,
  ShipOrderDto,
  CancelOrderDto,
  DeliverOrderDto,
} from "../dtos/order.dto";

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

export class OrderService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly repository: OrderRepository,
    private readonly inventoryService: InventoryService,
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
          Math.min(100 * 2 ** attempt, 2000) +
          Math.floor(Math.random() * 100);

        await new Promise((r) => setTimeout(r, delay));
      }
    }
  }

  /**
   * Charge une commande et vérifie que l'utilisateur y a accès
   * (propriétaire de la commande OU propriétaire de la boutique).
   */
  private async loadAuthorizedOrder(
    db: Prisma.TransactionClient | PrismaClient,
    orderId: string,
    ctx: AuthContext,
  ) {
    const order = await db.order.findUnique({
      where: { id: orderId },
      include: {
        store: {
          select: {
            id: true,
            professionalId: true,
            professional: { select: { userId: true } },
          },
        },
      },
    });

    if (!order) {
      throw new OrderError(
        OrderErrorCode.ORDER_NOT_FOUND,
        "Commande introuvable.",
      );
    }

    const isOwner = order.userId === ctx.userId;
    const isStoreOwner = order.store.professional.userId === ctx.userId;

    if (!isOwner && !isStoreOwner) {
      throw new OrderError(
        OrderErrorCode.UNAUTHORIZED_ORDER,
        "Vous n'êtes pas autorisé à accéder à cette commande.",
      );
    }

    return order;
  }

  /**
   * Vérifie qu'une transition d'état est autorisée.
   */
  private assertTransition(
    from: string,
    to: string,
    validTransitions: Record<string, string[]>,
  ): void {
    const allowed = validTransitions[from] ?? [];
    if (!allowed.includes(to)) {
      throw new OrderError(
        OrderErrorCode.INVALID_ORDER_STATE,
        `Transition invalide : ${from} → ${to}.`,
      );
    }
  }

  private static readonly TRANSITIONS: Record<string, string[]> = {
    PENDING: ["PAID", "CANCELLED"],
    PAID: ["SHIPPED", "CANCELLED", "REFUNDED"],
    SHIPPED: ["DELIVERED"],
    DELIVERED: ["REFUNDED"],
    CANCELLED: [],
    REFUNDED: [],
  };

  /**
   * Réserve du stock en traduisant les CatalogError en OrderError.
   *
   * `inventoryService.reserve()` **throw** une CatalogError en cas
   * d'échec, il ne retourne jamais `null`.
   */
  private async reserveStockOrFail(
  inventoryId: string,
  quantity: number,
  itemLabel: string,
  tx: Prisma.TransactionClient,
): Promise<void> {
  try {
    await this.inventoryService.reserve(inventoryId, quantity, tx);
  } catch (error) {
    if (error instanceof CatalogError) {
      if (error.code === CatalogErrorCode.INVALID_INVENTORY_QUANTITY) {
        throw new OrderError(
          OrderErrorCode.INSUFFICIENT_STOCK,
          `Stock insuffisant pour "${itemLabel}".`,
        );
      }
      if (error.code === CatalogErrorCode.INVENTORY_NOT_FOUND) {
        throw new OrderError(
          OrderErrorCode.INVENTORY_NOT_FOUND,
          `Stock introuvable pour "${itemLabel}".`,
        );
      }
    }
    throw error;
  }
}

  /**
   * Libère du stock en traduisant les CatalogError.
   *
   * Ne bloque PAS l'opération appelante : log un warning
   * mais continue (l'annulation doit toujours aboutir).
   */
  private async releaseStockSafe(
    inventoryId: string,
    quantity: number,
  ): Promise<void> {
    try {
      await this.inventoryService.release(inventoryId, quantity);
    } catch (error) {
      if (error instanceof CatalogError) {
        console.warn(
          `[OrderService] Release échoué pour inventory ${inventoryId} (qty ${quantity}):`,
          error.message,
        );
        return;
      }
      throw error;
    }
  }

  /**
   * Commit une réservation en traduisant les CatalogError.
   *
   * Ne bloque PAS l'opération appelante : le paiement est déjà
   * confirmé côté provider, on log en critique et continue.
   */
  private async commitReservationSafe(
    inventoryId: string,
    quantity: number,
    orderId: string,
  ): Promise<void> {
    try {
      await this.inventoryService.commitReservation(
        inventoryId,
        quantity,
      );
    } catch (error) {
      console.error(
        `[OrderService] CRITIQUE — Commit échoué pour inventory ${inventoryId}, order ${orderId}, qty ${quantity}:`,
        error,
      );
      // On ne throw pas : le paiement est déjà validé côté provider,
      // on log et on continue. Un job de réconciliation corrigera.
    }
  }

  /* ================================================================
   * CREATE ORDER
   * ================================================================ */

  /**
   * Crée une commande.
   *
   * Étapes (dans une transaction Serializable) :
   *  1. Vérifier le store
   *  2. Pour chaque item :
   *     - Charger le produit/variant + inventory
   *     - Vérifier l'état (ACTIVE)
   *     - Réserver le stock (atomique)
   *  3. Créer Order + OrderItems (snapshots)
   *  4. Ajouter OrderStatusHistory
   */
  async createOrder(dto: CreateOrderDto, ctx: AuthContext) {
    if (!dto.items || dto.items.length === 0) {
      throw new OrderError(
        OrderErrorCode.EMPTY_ORDER,
        "La commande doit contenir au moins un item.",
      );
    }

    try {
      return await this.withSerializableRetry(() =>
        this.prisma.$transaction(
          async (tx) => {
            /* ----- 1. Vérifier le store ----- */
            const store = await tx.store.findUnique({
              where: { id: dto.storeId },
              select: {
                id: true,
                status: true,
                professional: { select: { userId: true } },
              },
            });

            if (!store) {
              throw new OrderError(
                OrderErrorCode.STORE_NOT_FOUND,
                "Boutique introuvable.",
              );
            }

            if (store.professional.userId === ctx.userId) {
              throw new OrderError(
                OrderErrorCode.UNAUTHORIZED_ORDER,
                "Vous ne pouvez pas commander dans votre propre boutique.",
              );
            }

            if (store.status !== "ACTIVE") {
              throw new OrderError(
                OrderErrorCode.STORE_NOT_ACTIVE,
                "Cette boutique n'est pas active.",
              );
            }

            /* ----- 2. Préparer les items ----- */
            type PreparedItem = {
              productId: string | null;
              variantId: string | null;
              productName: string;
              variantName: string | null;
              quantity: number;
              unitPrice: Prisma.Decimal;
              subtotal: Prisma.Decimal;
              inventoryId: string;
            };

            const preparedItems: PreparedItem[] = [];
            let totalAmount = new Prisma.Decimal(0);

            for (const item of dto.items) {
              /* ----- Cas 1 : produit simple ----- */
              if (item.productId) {
                const product = await tx.product.findUnique({
                  where: { id: item.productId },
                  include: { inventory: true },
                });

                if (!product) {
                  throw new OrderError(
                    OrderErrorCode.PRODUCT_NOT_FOUND,
                    `Produit ${item.productId} introuvable.`,
                  );
                }

                if (product.storeId !== dto.storeId) {
                  throw new OrderError(
                    OrderErrorCode.PRODUCT_NOT_FOUND,
                    "Le produit n'appartient pas à cette boutique.",
                  );
                }

                if (product.status !== "ACTIVE") {
                  throw new OrderError(
                    OrderErrorCode.PRODUCT_NOT_ACTIVE,
                    `Le produit "${product.name}" n'est pas disponible.`,
                  );
                }

                if (product.hasVariants) {
                  throw new OrderError(
                    OrderErrorCode.INVALID_ORDER_STATE,
                    `Le produit "${product.name}" utilise des variantes.`,
                  );
                }

                if (!product.inventory) {
                  throw new OrderError(
                    OrderErrorCode.INVENTORY_NOT_FOUND,
                    `Aucun stock pour "${product.name}".`,
                  );
                }

                /* Réservation atomique avec traduction d'erreur */
                await this.reserveStockOrFail(
                  product.inventory.id,
                  item.quantity,
                  product.name,
                  tx
                );

                const unitPrice = new Prisma.Decimal(product.price!);
                const subtotal = unitPrice.mul(item.quantity);
                totalAmount = totalAmount.add(subtotal);

                preparedItems.push({
                  productId: product.id,
                  variantId: null,
                  productName: product.name,
                  variantName: null,
                  quantity: item.quantity,
                  unitPrice,
                  subtotal,
                  inventoryId: product.inventory.id,
                });
              }

              /* ----- Cas 2 : variante ----- */
              if (item.variantId) {
                const variant = await tx.productVariant.findUnique({
                  where: { id: item.variantId },
                  include: {
                    inventory: true,
                    product: {
                      select: {
                        id: true,
                        name: true,
                        storeId: true,
                        status: true,
                        hasVariants: true,
                      },
                    },
                  },
                });

                if (!variant) {
                  throw new OrderError(
                    OrderErrorCode.VARIANT_NOT_FOUND,
                    `Variante ${item.variantId} introuvable.`,
                  );
                }

                if (variant.product.storeId !== dto.storeId) {
                  throw new OrderError(
                    OrderErrorCode.VARIANT_NOT_FOUND,
                    "La variante n'appartient pas à cette boutique.",
                  );
                }

                if (variant.product.status !== "ACTIVE") {
                  throw new OrderError(
                    OrderErrorCode.PRODUCT_NOT_ACTIVE,
                    `Le produit "${variant.product.name}" n'est pas disponible.`,
                  );
                }

                if (!variant.isActive) {
                  throw new OrderError(
                    OrderErrorCode.VARIANT_NOT_ACTIVE,
                    `La variante "${variant.name}" n'est plus disponible.`,
                  );
                }

                if (!variant.inventory) {
                  throw new OrderError(
                    OrderErrorCode.INVENTORY_NOT_FOUND,
                    `Aucun stock pour "${variant.name}".`,
                  );
                }

                /* Réservation atomique avec traduction d'erreur */
                await this.reserveStockOrFail(
                  variant.inventory.id,
                  item.quantity,
                  variant.name,
                  tx
                );

                const unitPrice = new Prisma.Decimal(variant.price);
                const subtotal = unitPrice.mul(item.quantity);
                totalAmount = totalAmount.add(subtotal);

                preparedItems.push({
                  productId: variant.product.id,
                  variantId: variant.id,
                  productName: variant.product.name,
                  variantName: variant.name,
                  quantity: item.quantity,
                  unitPrice,
                  subtotal,
                  inventoryId: variant.inventory.id,
                });
              }
            }

            /* ----- 3. Ajouter les frais de livraison ----- */
            const deliveryFee = new Prisma.Decimal(dto.deliveryFee ?? 0);
            const grandTotal = totalAmount.add(deliveryFee);

            /* ----- 4. Créer Order + OrderItems + History ----- */
            const order = await tx.order.create({
              data: {
                user: { connect: { id: ctx.userId } },
                store: { connect: { id: dto.storeId } },

                status: "PENDING",
                totalAmount: grandTotal,
                currency: dto.currency,

                deliveryAddress: dto.deliveryAddress,
                deliveryFee,
                notes: dto.notes ?? null,

                items: {
                  create: preparedItems.map((item) => ({
                    productId: item.productId,
                    variantId: item.variantId,
                    productName: item.productName,
                    variantName: item.variantName,
                    quantity: item.quantity,
                    unitPrice: item.unitPrice,
                    subtotal: item.subtotal,
                  })),
                },

                statusHistory: {
                  create: {
                    fromStatus: "PENDING",
                    toStatus: "PENDING",
                    changedBy: ctx.userId,
                    reason: "Création de la commande",
                  },
                },
              },
              include: {
                items: true,
                statusHistory: { orderBy: { changedAt: "asc" } },
                store: { select: { id: true, name: true, slug: true } },
              },
            });

            return order;
          },
          {
            isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
            timeout: TRANSACTION_TIMEOUT_MS,
          },
        ),
      );
    } catch (error) {
      if (error instanceof OrderError) throw error;
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        throw new OrderError(
          OrderErrorCode.INVALID_ORDER_STATE,
          "Erreur lors de la création de la commande.",
        );
      }
      throw error;
    }
  }

  /* ================================================================
   * GET / LIST
   * ================================================================ */

  async getOrder(orderId: string, ctx: AuthContext) {
    await this.loadAuthorizedOrder(this.prisma, orderId, ctx);
    return this.repository.findById(orderId);
  }

  async listMyOrders(
    ctx: AuthContext,
    options?: { status?: string; limit?: number; cursor?: string | null },
  ) {
    const results = await this.repository.listForUser(ctx.userId, options);

    const limit = Math.min(options?.limit ?? 20, 100);
    const hasMore = results.length > limit;
    const data = hasMore ? results.slice(0, limit) : results;

    return {
      data,
      hasMore,
      nextCursor: hasMore ? data[data.length - 1]?.id ?? null : null,
    };
  }

  async listStoreOrders(
    storeId: string,
    ctx: AuthContext,
    options?: { status?: string; limit?: number; cursor?: string | null },
  ) {
    const store = await this.prisma.store.findUnique({
      where: { id: storeId },
      select: {
        professional: { select: { userId: true } },
      },
    });

    if (!store || store.professional.userId !== ctx.userId) {
      throw new OrderError(
        OrderErrorCode.UNAUTHORIZED_STORE,
        "Vous n'êtes pas autorisé à consulter les commandes de cette boutique.",
      );
    }

    const results = await this.repository.listForStore(storeId, options);

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
   * SHIP
   * ================================================================ */

  async shipOrder(orderId: string, dto: ShipOrderDto, ctx: AuthContext) {
    try {
      return await this.withSerializableRetry(() =>
        this.prisma.$transaction(
          async (tx) => {
            const order = await this.loadAuthorizedOrder(tx, orderId, ctx);

            if (order.store.professional.userId !== ctx.userId) {
              throw new OrderError(
                OrderErrorCode.UNAUTHORIZED_STORE,
                "Seul le propriétaire de la boutique peut expédier.",
              );
            }

            this.assertTransition(
              order.status,
              "SHIPPED",
              OrderService.TRANSITIONS,
            );

            const updated = await tx.order.update({
              where: { id: orderId },
              data: {
                status: "SHIPPED",
                shippedAt: new Date(),
              },
              include: {
                items: true,
                statusHistory: { orderBy: { changedAt: "asc" } },
              },
            });

            await this.repository.addStatusHistory(
              {
                orderId,
                fromStatus: order.status,
                toStatus: "SHIPPED",
                changedBy: ctx.userId,
                reason: dto.trackingNumber
                  ? `Suivi : ${dto.trackingNumber}`
                  : null,
              },
              tx,
            );

            return updated;
          },
          {
            isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
            timeout: TRANSACTION_TIMEOUT_MS,
          },
        ),
      );
    } catch (error) {
      if (error instanceof OrderError) throw error;
      throw error;
    }
  }

  /* ================================================================
   * DELIVER
   * ================================================================ */

  async deliverOrder(
    orderId: string,
    dto: DeliverOrderDto,
    ctx: AuthContext,
  ) {
    try {
      return await this.withSerializableRetry(() =>
        this.prisma.$transaction(
          async (tx) => {
            const order = await this.loadAuthorizedOrder(tx, orderId, ctx);

            if (order.store.professional.userId !== ctx.userId) {
              throw new OrderError(
                OrderErrorCode.UNAUTHORIZED_STORE,
                "Seul le propriétaire de la boutique peut marquer comme livrée.",
              );
            }

            this.assertTransition(
              order.status,
              "DELIVERED",
              OrderService.TRANSITIONS,
            );

            const updated = await tx.order.update({
              where: { id: orderId },
              data: {
                status: "DELIVERED",
                deliveredAt: new Date(),
              },
              include: {
                items: true,
                statusHistory: { orderBy: { changedAt: "asc" } },
              },
            });

            await this.repository.addStatusHistory(
              {
                orderId,
                fromStatus: order.status,
                toStatus: "DELIVERED",
                changedBy: ctx.userId,
                reason: dto.deliveredBy ?? null,
              },
              tx,
            );

            return updated;
          },
          {
            isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
            timeout: TRANSACTION_TIMEOUT_MS,
          },
        ),
      );
    } catch (error) {
      if (error instanceof OrderError) throw error;
      throw error;
    }
  }

  /* ================================================================
   * CANCEL
   * ================================================================ */

  /**
   * Annule une commande.
   *
   * Effets :
   *  - Release du stock réservé (safe : ne bloque pas l'annulation)
   *  - Passage à CANCELLED
   */
  async cancelOrder(
    orderId: string,
    dto: CancelOrderDto,
    ctx: AuthContext,
  ) {
    try {
      return await this.withSerializableRetry(() =>
        this.prisma.$transaction(
          async (tx) => {
            const order = await this.loadAuthorizedOrder(tx, orderId, ctx);

            this.assertTransition(
              order.status,
              "CANCELLED",
              OrderService.TRANSITIONS,
            );

            /* Charger les items pour libérer le stock */
            const items = await tx.orderItem.findMany({
              where: { orderId },
            });

            /* Release du stock pour chaque item (safe) */
            for (const item of items) {
              const inventory = await tx.inventory.findUnique({
                where: item.variantId
                  ? { variantId: item.variantId }
                  : { productId: item.productId! },
              });

              if (inventory) {
                await this.releaseStockSafe(
                  inventory.id,
                  item.quantity,
                );
              }
            }

            /* Mettre à jour la commande */
            const updated = await tx.order.update({
              where: { id: orderId },
              data: {
                status: "CANCELLED",
                canceledAt: new Date(),
              },
              include: {
                items: true,
                statusHistory: { orderBy: { changedAt: "asc" } },
              },
            });

            await this.repository.addStatusHistory(
              {
                orderId,
                fromStatus: order.status,
                toStatus: "CANCELLED",
                changedBy: ctx.userId,
                reason: dto.reason,
              },
              tx,
            );

            return updated;
          },
          {
            isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
            timeout: TRANSACTION_TIMEOUT_MS,
          },
        ),
      );
    } catch (error) {
      if (error instanceof OrderError) throw error;
      throw error;
    }
  }

  /* ================================================================
   * MARK AS PAID (appelé par PaymentService)
   * ================================================================ */

  /**
   * Marque une commande comme payée.
   *
   * Effets :
   *  - Commit du stock réservé (quantity -= qty, reserved -= qty)
   *  - Passage à PAID
   *
   * Appelé par le webhook de paiement après confirmation.
   *
   * Le commit est "safe" : si un commit échoue, on log en critique
   * mais on ne bloque pas la transition PAID (le paiement est déjà
   * confirmé côté provider).
   */
  async markAsPaid(
    orderId: string,
    tx?: Prisma.TransactionClient,
  ) {
    const db = tx ?? this.prisma;

    const order = await db.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });

    if (!order) {
      throw new OrderError(
        OrderErrorCode.ORDER_NOT_FOUND,
        "Commande introuvable.",
      );
    }

    this.assertTransition(
      order.status,
      "PAID",
      OrderService.TRANSITIONS,
    );

    /* Commit du stock pour chaque item (safe) */
    for (const item of order.items) {
      const inventory = await db.inventory.findUnique({
        where: item.variantId
          ? { variantId: item.variantId }
          : { productId: item.productId! },
      });

      if (inventory) {
        await this.commitReservationSafe(
          inventory.id,
          item.quantity,
          orderId,
        );
      }
    }

    const updated = await db.order.update({
      where: { id: orderId },
      data: {
        status: "PAID",
      },
      include: {
        items: true,
        statusHistory: { orderBy: { changedAt: "asc" } },
      },
    });

    await this.repository.addStatusHistory(
      {
        orderId,
        fromStatus: order.status, // ✅ dynamique
        toStatus: "PAID",
        reason: "Paiement confirmé",
      },
      db,
    );

    return updated;
  }
}