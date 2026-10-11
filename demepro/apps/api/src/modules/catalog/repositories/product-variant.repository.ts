import { Prisma, PrismaClient } from "../../../generated/prisma";

export class ProductVariantRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(
    id: string,
    tx: Prisma.TransactionClient | PrismaClient = this.prisma,
  ) {
    return tx.productVariant.findUnique({
      where: { id },
      include: {
        product: {
          select: {
            id: true,
            storeId: true,
            hasVariants: true,
            status: true,
          },
        },
        inventory: true,
      },
    });
  }

  async findByProductId(
    productId: string,
    tx: Prisma.TransactionClient | PrismaClient = this.prisma,
  ) {
    return tx.productVariant.findMany({
      where: {
        productId,
      },
      include: {
        inventory: true,
      },
      orderBy: {
        createdAt: "asc",
      },
    });
  }

  async findActiveByProductId(
    productId: string,
    tx: Prisma.TransactionClient | PrismaClient = this.prisma,
  ) {
    return tx.productVariant.findMany({
      where: {
        productId,
        isActive: true,
      },
      include: {
        inventory: true,
      },
      orderBy: {
        createdAt: "asc",
      },
    });
  }

  async findBySku(
    sku: string,
    tx: Prisma.TransactionClient | PrismaClient = this.prisma,
  ) {
    return tx.productVariant.findUnique({
      where: {
        sku,
      },
    });
  }

  async findBySkuExcludingId(
    sku: string,
    variantId: string,
    tx: Prisma.TransactionClient | PrismaClient = this.prisma,
  ) {
    return tx.productVariant.findFirst({
      where: {
        sku,
        NOT: {
          id: variantId,
        },
      },
    });
  }

  async countByProductId(
    productId: string,
    tx: Prisma.TransactionClient | PrismaClient = this.prisma,
  ) {
    return tx.productVariant.count({
      where: {
        productId,
      },
    });
  }

  async countActiveByProductId(
    productId: string,
    tx: Prisma.TransactionClient | PrismaClient = this.prisma,
  ) {
    return tx.productVariant.count({
      where: {
        productId,
        isActive: true,
      },
    });
  }

  async create(
    data: Prisma.ProductVariantCreateInput,
    tx: Prisma.TransactionClient | PrismaClient = this.prisma,
  ) {
    return tx.productVariant.create({
      data,
      include: {
        inventory: true,
      },
    });
  }

  async update(
    id: string,
    data: Prisma.ProductVariantUpdateInput,
    tx: Prisma.TransactionClient | PrismaClient = this.prisma,
  ) {
    return tx.productVariant.update({
      where: { id },
      data,
      include: {
        inventory: true,
      },
    });
  }

  async delete(
    id: string,
    tx: Prisma.TransactionClient | PrismaClient = this.prisma,
  ) {
    return tx.productVariant.delete({
      where: { id },
    });
  }

  async deleteByProductId(
    productId: string,
    tx: Prisma.TransactionClient | PrismaClient = this.prisma,
  ) {
    return tx.productVariant.deleteMany({
      where: {
        productId,
      },
    });
  }

  /**
   * Vérifie qu'un SKU n'est utilisé par aucun autre variant.
   */
  async skuExists(
    sku: string,
    excludeVariantId?: string,
    tx: Prisma.TransactionClient | PrismaClient = this.prisma,
  ) {
    const variant = await tx.productVariant.findFirst({
      where: {
        sku,
        ...(excludeVariantId
          ? {
              NOT: {
                id: excludeVariantId,
              },
            }
          : {}),
      },
      select: {
        id: true,
      },
    });

    return Boolean(variant);
  }
}
