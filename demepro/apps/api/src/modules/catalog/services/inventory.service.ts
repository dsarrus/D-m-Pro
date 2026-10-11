// apps/api/src/modules/catalog/services/InventoryService.ts

import { Prisma, PrismaClient } from "../../../generated/prisma";

import { InventoryRepository } from "../repositories/inventory.repository";
import { CatalogError, CatalogErrorCode } from "../errors/catalog.error";

export class InventoryService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly inventoryRepository: InventoryRepository,
  ) {}

  /* ================================================================
   * HELPERS PRIVÉS
   * ================================================================ */

  /**
   * Charge un inventaire avec toutes ses relations de propriété.
   * Retourne l'inventaire ou lance INVENTORY_NOT_FOUND.
   */
  private async loadInventoryWithOwner(
    db: Prisma.TransactionClient | PrismaClient,
    inventoryId: string,
  ) {
    const inventory = await db.inventory.findUnique({
      where: { id: inventoryId },
      include: {
        product: {
          include: {
            store: {
              include: {
                professional: {
                  select: { userId: true },
                },
              },
            },
          },
        },
        variant: {
          include: {
            product: {
              include: {
                store: {
                  include: {
                    professional: {
                      select: { userId: true },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!inventory) {
      throw new CatalogError(
        CatalogErrorCode.INVENTORY_NOT_FOUND,
        "Stock introuvable.",
      );
    }

    return inventory;
  }

  /**
   * Extrait l'userId propriétaire d'un inventaire
   * (produit simple OU variante).
   */
  private extractOwnerUserId(
    inventory: Awaited<ReturnType<typeof this.loadInventoryWithOwner>>,
  ): string | undefined {
    return (
      inventory.product?.store.professional.userId ??
      inventory.variant?.product.store.professional.userId
    );
  }

  /**
   * Vérifie la propriété. Lance UNAUTHORIZED_STORE si mismatch.
   */
  private assertOwnership(
    inventory: Awaited<ReturnType<typeof this.loadInventoryWithOwner>>,
    userId: string,
  ): void {
    const ownerUserId = this.extractOwnerUserId(inventory);

    if (ownerUserId !== userId) {
      throw new CatalogError(
        CatalogErrorCode.UNAUTHORIZED_STORE,
        "Vous n'êtes pas autorisé à modifier ce stock.",
      );
    }
  }

  /**
   * Charge un produit et vérifie la propriété.
   */
  private async getAuthorizedProduct(
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

  /* ================================================================
   * CRÉATION
   * ================================================================ */

  /**
   * Création d'un stock pour un produit simple.
   */
  async createForProduct(productId: string, userId: string, quantity = 0) {
    return this.prisma.$transaction(async (tx) => {
      const product = await this.getAuthorizedProduct(tx, productId, userId);

      if (product.hasVariants) {
        throw new CatalogError(
          CatalogErrorCode.INVALID_PRODUCT_STATE,
          "Un produit avec variantes ne peut pas avoir un stock direct.",
        );
      }

      if (quantity < 0) {
        throw new CatalogError(
          CatalogErrorCode.INVALID_INVENTORY_QUANTITY,
          "La quantité ne peut pas être négative.",
        );
      }

      const existing = await tx.inventory.findUnique({
        where: { productId },
      });

      if (existing) return existing;

      return tx.inventory.create({
        data: {
          product: { connect: { id: productId } },
          quantity,
          reserved: 0,
        },
      });
    });
  }

  /**
   * Création d'un stock pour une variante.
   */
  async createForVariant(variantId: string, userId: string, quantity = 0) {
    return this.prisma.$transaction(async (tx) => {
      const variant = await tx.productVariant.findUnique({
        where: { id: variantId },
        include: {
          product: {
            include: {
              store: {
                include: {
                  professional: {
                    select: { userId: true },
                  },
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
          "Vous n'êtes pas autorisé à modifier ce stock.",
        );
      }

      if (!variant.product.hasVariants) {
        throw new CatalogError(
          CatalogErrorCode.PRODUCT_HAS_NO_VARIANTS,
          "Le produit n'est pas configuré avec des variantes.",
        );
      }

      if (quantity < 0) {
        throw new CatalogError(
          CatalogErrorCode.INVALID_INVENTORY_QUANTITY,
          "La quantité ne peut pas être négative.",
        );
      }

      const existing = await tx.inventory.findUnique({
        where: { variantId },
      });

      if (existing) return existing;

      return tx.inventory.create({
        data: {
          variant: { connect: { id: variantId } },
          quantity,
          reserved: 0,
        },
      });
    });
  }

  /* ================================================================
   * MISE À JOUR ABSOLUE
   * ================================================================ */

  async setQuantity(inventoryId: string, userId: string, quantity: number) {
    if (quantity < 0) {
      throw new CatalogError(
        CatalogErrorCode.INVALID_INVENTORY_QUANTITY,
        "La quantité ne peut pas être négative.",
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const inventory = await this.loadInventoryWithOwner(tx, inventoryId);

      this.assertOwnership(inventory, userId);

      if (quantity < inventory.reserved) {
        throw new CatalogError(
          CatalogErrorCode.INVALID_INVENTORY_QUANTITY,
          `La quantité ne peut pas être inférieure au stock réservé (${inventory.reserved}).`,
        );
      }

      return tx.inventory.update({
        where: { id: inventoryId },
        data: { quantity },
      });
    });
  }

  /* ================================================================
   * AJUSTEMENT RELATIF
   * ================================================================ */

  async adjustQuantity(inventoryId: string, userId: string, delta: number) {
    return this.prisma.$transaction(async (tx) => {
      const inventory = await this.loadInventoryWithOwner(tx, inventoryId);

      this.assertOwnership(inventory, userId);

      const newQuantity = inventory.quantity + delta;

      if (newQuantity < 0) {
        throw new CatalogError(
          CatalogErrorCode.INVALID_INVENTORY_QUANTITY,
          "La quantité ne peut pas être négative.",
        );
      }

      if (newQuantity < inventory.reserved) {
        throw new CatalogError(
          CatalogErrorCode.INVALID_INVENTORY_QUANTITY,
          `Stock insuffisant. Stock réservé : ${inventory.reserved}.`,
        );
      }

      return tx.inventory.update({
        where: { id: inventoryId },
        data: { quantity: newQuantity },
      });
    });
  }

  /* ================================================================
   * RÉSERVATION ATOMIQUE
   * ================================================================ */

  /**
   * Réserve du stock de manière atomique.
   *
   * UPDATE conditionnel :
   *   quantity - reserved >= quantity
   *
   * Si 0 ligne affectée → distinguer introuvable vs insuffisant.
   */
  async reserve(inventoryId: string, quantity: number) {
    if (quantity <= 0) {
      throw new CatalogError(
        CatalogErrorCode.INVALID_INVENTORY_QUANTITY,
        "La quantité à réserver doit être supérieure à zéro.",
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const reserved = await this.inventoryRepository.tryReserve(
        inventoryId,
        quantity,
        tx,
      );

      if (reserved) return reserved;

      /* ----- Échec : distinguer introuvable vs insuffisant ----- */
      const inventory = await tx.inventory.findUnique({
        where: { id: inventoryId },
      });

      if (!inventory) {
        throw new CatalogError(
          CatalogErrorCode.INVENTORY_NOT_FOUND,
          "Stock introuvable.",
        );
      }

      const available = inventory.quantity - inventory.reserved;

      throw new CatalogError(
        CatalogErrorCode.INVALID_INVENTORY_QUANTITY,
        `Stock disponible insuffisant. Disponible : ${available}, demandé : ${quantity}.`,
      );
    });
  }

  /* ================================================================
   * LIBÉRATION ATOMIQUE
   * ================================================================ */

  /**
   * Libère une réservation de manière atomique.
   *
   * UPDATE conditionnel :
   *   reserved >= quantity
   */
  async release(inventoryId: string, quantity: number) {
    if (quantity <= 0) {
      throw new CatalogError(
        CatalogErrorCode.INVALID_INVENTORY_QUANTITY,
        "La quantité à libérer doit être supérieure à zéro.",
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const released = await this.inventoryRepository.tryRelease(
        inventoryId,
        quantity,
        tx,
      );

      if (released) return released;

      const inventory = await tx.inventory.findUnique({
        where: { id: inventoryId },
      });

      if (!inventory) {
        throw new CatalogError(
          CatalogErrorCode.INVENTORY_NOT_FOUND,
          "Stock introuvable.",
        );
      }

      throw new CatalogError(
        CatalogErrorCode.INVALID_INVENTORY_QUANTITY,
        `La quantité à libérer (${quantity}) dépasse le stock réservé (${inventory.reserved}).`,
      );
    });
  }

  /* ================================================================
   * COMMIT DE RÉSERVATION
   * ================================================================ */

  /**
   * Consomme une réservation : le stock physique est décrémenté
   * et la réservation libérée dans la même opération atomique.
   *
   * À utiliser quand une commande passe de PENDING à PAID.
   */
  async commitReservation(inventoryId: string, quantity: number) {
    if (quantity <= 0) {
      throw new CatalogError(
        CatalogErrorCode.INVALID_INVENTORY_QUANTITY,
        "La quantité doit être supérieure à zéro.",
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const committed = await this.inventoryRepository.tryCommitReservation(
        inventoryId,
        quantity,
        tx,
      );

      if (committed) return committed;

      const inventory = await tx.inventory.findUnique({
        where: { id: inventoryId },
      });

      if (!inventory) {
        throw new CatalogError(
          CatalogErrorCode.INVENTORY_NOT_FOUND,
          "Stock introuvable.",
        );
      }

      throw new CatalogError(
        CatalogErrorCode.INVALID_INVENTORY_QUANTITY,
        `Impossible de consommer la réservation. Réservé : ${inventory.reserved}, quantité : ${inventory.quantity}, demandé : ${quantity}.`,
      );
    });
  }

  /* ================================================================
   * LECTURE
   * ================================================================ */

  async getById(inventoryId: string, userId: string) {
    const inventory = await this.inventoryRepository.findById(inventoryId);

    if (!inventory) {
      throw new CatalogError(
        CatalogErrorCode.INVENTORY_NOT_FOUND,
        "Stock introuvable.",
      );
    }

    const ownerUserId =
      inventory.product?.store?.professional?.userId ??
      inventory.variant?.product?.store?.professional?.userId;

    if (ownerUserId !== userId) {
      throw new CatalogError(
        CatalogErrorCode.UNAUTHORIZED_STORE,
        "Vous n'êtes pas autorisé à consulter ce stock.",
      );
    }

    return inventory;
  }
}
