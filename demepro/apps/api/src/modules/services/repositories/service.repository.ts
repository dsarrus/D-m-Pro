// apps/api/src/modules/services/repositories/service.repository.ts

import { Prisma, PrismaClient } from "../../../generated/prisma/client";

export class ServiceRepository {
  constructor(private readonly prisma: PrismaClient) {}

  /* ================================================================
   * LECTURES
   * ================================================================ */

  async findById(
    id: string,
    tx: Prisma.TransactionClient | PrismaClient = this.prisma,
  ) {
    return tx.service.findUnique({
      where: { id },
      include: {
        category: { select: { id: true, name: true, slug: true } },
        professional: {
          select: {
            id: true,
            userId: true,
            businessName: true,
            slug: true,
            avatarKey: true,
            verificationStatus: true,
          },
        },
        images: { orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }] },
        zones: true,
        availabilities: true,
      },
    });
  }

  async findBySlugForProfessional(
    professionalId: string,
    slug: string,
    tx: Prisma.TransactionClient | PrismaClient = this.prisma,
  ) {
    return tx.service.findUnique({
      where: { professionalId_slug: { professionalId, slug } },
    });
  }

  async listByProfessional(
    professionalId: string,
    tx: Prisma.TransactionClient | PrismaClient = this.prisma,
  ) {
    return tx.service.findMany({
      where: { professionalId },
      include: { images: { where: { isPrimary: true }, take: 1 } },
      orderBy: { createdAt: "desc" },
    });
  }

  async list(
    filters: {
      categoryId?: string;
      professionalId?: string;
      status?: "DRAFT" | "ACTIVE" | "INACTIVE" | "ARCHIVED";
      limit?: number;
      cursor?: string | null;
    },
    tx: Prisma.TransactionClient | PrismaClient = this.prisma,
  ) {
    const limit = Math.min(filters.limit ?? 20, 100);

    return tx.service.findMany({
      where: {
        ...(filters.categoryId ? { categoryId: filters.categoryId } : {}),
        ...(filters.professionalId ? { professionalId: filters.professionalId } : {}),
        ...(filters.status ? { status: filters.status } : {}),
      },
      include: {
        images: { where: { isPrimary: true }, take: 1 },
        professional: {
          select: {
            id: true,
            businessName: true,
            slug: true,
            ratingAverage: true,
            ratingCount: true,
          },
        },
        category: { select: { id: true, name: true, slug: true } },
      },
      orderBy: { createdAt: "desc" },
      take: limit + 1,
      ...(filters.cursor ? { cursor: { id: filters.cursor }, skip: 1 } : {}),
    });
  }

  async countServices(
    professionalId: string,
    tx: Prisma.TransactionClient | PrismaClient = this.prisma,
  ) {
    return tx.service.count({ where: { professionalId } });
  }

  /* ================================================================
   * ÉCRITURES
   * ================================================================ */

  async create(
    data: Prisma.ServiceCreateInput,
    tx: Prisma.TransactionClient | PrismaClient = this.prisma,
  ) {
    return tx.service.create({ data });
  }

  async update(
    id: string,
    data: Prisma.ServiceUpdateInput,
    tx: Prisma.TransactionClient | PrismaClient = this.prisma,
  ) {
    return tx.service.update({ where: { id }, data });
  }

  async delete(
    id: string,
    tx: Prisma.TransactionClient | PrismaClient = this.prisma,
  ) {
    return tx.service.delete({ where: { id } });
  }
}