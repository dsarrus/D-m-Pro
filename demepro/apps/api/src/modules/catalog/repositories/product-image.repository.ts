// apps/api/src/modules/catalog/repositories/product-image.repository.ts

import { Prisma, PrismaClient } from "../../../generated/prisma";

export class ProductImageRepository {
  constructor(private readonly prisma: PrismaClient) {}

  /* ================================================================
   * LECTURES
   * ================================================================ */

  async findById(
    id: string,
    tx: Prisma.TransactionClient | PrismaClient = this.prisma,
  ) {
    return tx.productImage.findUnique({
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
      },
    });
  }

  async findByProductId(
    productId: string,
    tx: Prisma.TransactionClient | PrismaClient = this.prisma,
  ) {
    return tx.productImage.findMany({
      where: { productId },
      orderBy: [
        { isPrimary: "desc" },
        { sortOrder: "asc" },
        { createdAt: "asc" },
      ],
    });
  }

  async countByProductId(
    productId: string,
    tx: Prisma.TransactionClient | PrismaClient = this.prisma,
  ) {
    return tx.productImage.count({
      where: { productId },
    });
  }

  /**
   * Récupère l'image primaire actuelle d'un produit, s'il y en a une.
   */
  async findPrimaryByProductId(
    productId: string,
    tx: Prisma.TransactionClient | PrismaClient = this.prisma,
  ) {
    return tx.productImage.findFirst({
      where: { productId, isPrimary: true },
    });
  }

  /**
   * Récupère la prochaine image à promouvoir en primaire.
   * Exclut éventuellement une image (celle qu'on est en train de retirer).
   */
  async findNextCandidate(
    productId: string,
    excludeImageId: string | undefined,
    tx: Prisma.TransactionClient | PrismaClient = this.prisma,
  ) {
    return tx.productImage.findFirst({
      where: {
        productId,
        ...(excludeImageId ? { NOT: { id: excludeImageId } } : {}),
      },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    });
  }

  /* ================================================================
   * ÉCRITURES
   * ================================================================ */

  async create(
    data: Prisma.ProductImageCreateInput,
    tx: Prisma.TransactionClient | PrismaClient = this.prisma,
  ) {
    return tx.productImage.create({ data });
  }

  async createMany(
    data: Prisma.ProductImageCreateManyInput[],
    tx: Prisma.TransactionClient | PrismaClient = this.prisma,
  ) {
    return tx.productImage.createMany({ data });
  }

  async update(
    id: string,
    data: Prisma.ProductImageUpdateInput,
    tx: Prisma.TransactionClient | PrismaClient = this.prisma,
  ) {
    return tx.productImage.update({
      where: { id },
      data,
    });
  }

  async delete(
    id: string,
    tx: Prisma.TransactionClient | PrismaClient = this.prisma,
  ) {
    return tx.productImage.delete({ where: { id } });
  }

  async unsetPrimary(
    productId: string,
    tx: Prisma.TransactionClient | PrismaClient = this.prisma,
  ) {
    return tx.productImage.updateMany({
      where: { productId, isPrimary: true },
      data: { isPrimary: false },
    });
  }

  async setPrimary(
    id: string,
    tx: Prisma.TransactionClient | PrismaClient = this.prisma,
  ) {
    return tx.productImage.update({
      where: { id },
      data: { isPrimary: true },
    });
  }
}
