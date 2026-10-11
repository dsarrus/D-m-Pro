// apps/api/src/modules/stores/repositories/store.repository.ts

import { Prisma, PrismaClient } from "../../../generated/prisma/client";

export class StoreRepository {
  constructor(private readonly prisma: PrismaClient) {}

  /* ================================================================
   * LECTURES
   * ================================================================ */

  async findById(
    id: string,
    tx: Prisma.TransactionClient | PrismaClient = this.prisma,
  ) {
    return tx.store.findUnique({
      where: { id },
      include: {
        professional: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                phone: true,
                status: true,
              },
            },
          },
        },
      },
    });
  }

  async findBySlug(
    slug: string,
    tx: Prisma.TransactionClient | PrismaClient = this.prisma,
  ) {
    return tx.store.findUnique({
      where: { slug },
      include: {
        professional: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                phone: true,
                status: true,
              },
            },
          },
        },
      },
    });
  }

  async findByProfessionalId(
    professionalId: string,
    tx: Prisma.TransactionClient | PrismaClient = this.prisma,
  ) {
    return tx.store.findUnique({
      where: { professionalId },
      include: {
        professional: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                phone: true,
                status: true,
              },
            },
          },
        },
      },
    });
  }

  async countProducts(
    storeId: string,
    tx: Prisma.TransactionClient | PrismaClient = this.prisma,
  ) {
    return tx.product.count({ where: { storeId } });
  }

  /* ================================================================
   * LISTE PUBLIQUE (stores actives)
   * ================================================================ */

  async listActive(
    options: {
      limit?: number;
      cursor?: string | null;
    } = {},
    tx: Prisma.TransactionClient | PrismaClient = this.prisma,
  ) {
    const limit = Math.min(options.limit ?? 20, 100);

    return tx.store.findMany({
      where: { status: "ACTIVE" },
      include: {
        professional: {
          select: {
            id: true,
            businessName: true,
            slug: true,
            avatarKey: true,
            ratingAverage: true,
            ratingCount: true,
            verificationStatus: true,
          },
        },
        _count: {
          select: { products: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: limit + 1,
      ...(options.cursor
        ? {
            cursor: { id: options.cursor },
            skip: 1,
          }
        : {}),
    });
  }

  /* ================================================================
   * ÉCRITURES
   * ================================================================ */

  async create(
    data: Prisma.StoreCreateInput,
    tx: Prisma.TransactionClient | PrismaClient = this.prisma,
  ) {
    return tx.store.create({
      data,
      include: {
        professional: {
          include: {
            user: {
              select: { id: true, email: true, phone: true },
            },
          },
        },
      },
    });
  }

  async update(
    id: string,
    data: Prisma.StoreUpdateInput,
    tx: Prisma.TransactionClient | PrismaClient = this.prisma,
  ) {
    return tx.store.update({
      where: { id },
      data,
      include: {
        professional: {
          include: {
            user: {
              select: { id: true, email: true, phone: true },
            },
          },
        },
      },
    });
  }

  async delete(
    id: string,
    tx: Prisma.TransactionClient | PrismaClient = this.prisma,
  ) {
    return tx.store.delete({ where: { id } });
  }
}