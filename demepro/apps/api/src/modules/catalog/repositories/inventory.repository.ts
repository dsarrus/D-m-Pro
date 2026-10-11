// apps/api/src/modules/catalog/repositories/InventoryRepository.ts

import { Prisma, PrismaClient } from "../../../generated/prisma/client";

export class InventoryRepository {
  constructor(private readonly prisma: PrismaClient) {}

  /* ================================================================
   * LECTURES
   * ================================================================ */

  async findById(id: string, tx: Prisma.TransactionClient | PrismaClient = this.prisma) {
  return tx.inventory.findUnique({
    where: { id },
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
}

  async findByProductId(
    productId: string,
    tx: Prisma.TransactionClient | PrismaClient = this.prisma,
  ) {
    return tx.inventory.findUnique({
      where: { productId },
    });
  }

  async findByVariantId(
    variantId: string,
    tx: Prisma.TransactionClient | PrismaClient = this.prisma,
  ) {
    return tx.inventory.findUnique({
      where: { variantId },
    });
  }

  /* ================================================================
   * ÉCRITURES SIMPLES
   * ================================================================ */

  async create(
    data: Prisma.InventoryCreateInput,
    tx: Prisma.TransactionClient | PrismaClient = this.prisma,
  ) {
    return tx.inventory.create({ data });
  }

  async updateQuantity(
    id: string,
    quantity: number,
    tx: Prisma.TransactionClient | PrismaClient = this.prisma,
  ) {
    return tx.inventory.update({
      where: { id },
      data: { quantity },
    });
  }

  async adjustQuantity(
    id: string,
    delta: number,
    tx: Prisma.TransactionClient | PrismaClient = this.prisma,
  ) {
    return tx.inventory.update({
      where: { id },
      data: {
        quantity: { increment: delta },
      },
    });
  }

  /* ================================================================
   * OPÉRATIONS ATOMIQUES (SQL brut)
   * ================================================================
   *
   * Ces méthodes utilisent `UPDATE ... WHERE ... RETURNING` pour
   * garantir l'atomicité sans race condition, contrairement à un
   * `findUnique` + `update` qui laisse une fenêtre entre les deux.
   *
   * Le cast `::uuid` est obligatoire : Prisma envoie les paramètres
   * typés `text` et PostgreSQL refuse de comparer `uuid = text`.
   */

  /**
   * Réservation atomique.
   *
   * UPDATE inventory
   * SET reserved = reserved + $1
   * WHERE id = $2
   *   AND quantity - reserved >= $1
   * RETURNING *;
   *
   * @returns la ligne rechargée avec relations si succès, null sinon.
   */
  async tryReserve(
    id: string,
    quantity: number,
    tx: Prisma.TransactionClient | PrismaClient = this.prisma,
  ) {
    const rows = await tx.$queryRaw<Array<{ id: string }>>`
      UPDATE "inventory"
      SET "reserved" = "reserved" + ${quantity}
      WHERE "id" = ${id}::uuid
        AND "quantity" - "reserved" >= ${quantity}
      RETURNING "id";
    `;

    if (rows.length === 0) return null;

    return tx.inventory.findUnique({
      where: { id },
      include: {
        product: true,
        variant: true,
      },
    });
  }

  /**
   * Libération atomique.
   *
   * UPDATE inventory
   * SET reserved = reserved - $1
   * WHERE id = $2
   *   AND reserved >= $1
   * RETURNING *;
   *
   * @returns la ligne rechargée avec relations si succès, null sinon.
   */
  async tryRelease(
    id: string,
    quantity: number,
    tx: Prisma.TransactionClient | PrismaClient = this.prisma,
  ) {
    const rows = await tx.$queryRaw<Array<{ id: string }>>`
      UPDATE "inventory"
      SET "reserved" = "reserved" - ${quantity}
      WHERE "id" = ${id}::uuid
        AND "reserved" >= ${quantity}
      RETURNING "id";
    `;

    if (rows.length === 0) return null;

    return tx.inventory.findUnique({
      where: { id },
      include: {
        product: true,
        variant: true,
      },
    });
  }

  /**
   * Consommation d'une réservation.
   *
   * Décrémente simultanément `quantity` et `reserved`.
   * Utilisé lorsqu'une commande passe de PENDING à PAID.
   *
   * UPDATE inventory
   * SET quantity = quantity - $1,
   *     reserved = reserved - $1
   * WHERE id = $2
   *   AND reserved >= $1
   *   AND quantity >= $1
   * RETURNING *;
   *
   * @returns la ligne rechargée avec relations si succès, null sinon.
   */
  async tryCommitReservation(
    id: string,
    quantity: number,
    tx: Prisma.TransactionClient | PrismaClient = this.prisma,
  ) {
    const rows = await tx.$queryRaw<Array<{ id: string }>>`
      UPDATE "inventory"
      SET "quantity" = "quantity" - ${quantity},
          "reserved" = "reserved" - ${quantity}
      WHERE "id" = ${id}::uuid
        AND "reserved" >= ${quantity}
        AND "quantity" >= ${quantity}
      RETURNING "id";
    `;

    if (rows.length === 0) return null;

    return tx.inventory.findUnique({
      where: { id },
      include: {
        product: true,
        variant: true,
      },
    });
  }
}
