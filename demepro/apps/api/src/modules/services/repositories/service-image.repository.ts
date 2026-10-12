// apps/api/src/modules/services/repositories/service-image.repository.ts

import { Prisma, PrismaClient } from "../../../generated/prisma/client";

export class ServiceImageRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(
    id: string,
    tx: Prisma.TransactionClient | PrismaClient = this.prisma,
  ) {
    return tx.serviceImage.findUnique({ where: { id } });
  }

  async listByService(
    serviceId: string,
    tx: Prisma.TransactionClient | PrismaClient = this.prisma,
  ) {
    return tx.serviceImage.findMany({
      where: { serviceId },
      orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }],
    });
  }

  async countByService(
    serviceId: string,
    tx: Prisma.TransactionClient | PrismaClient = this.prisma,
  ) {
    return tx.serviceImage.count({ where: { serviceId } });
  }

  async create(
    data: Prisma.ServiceImageCreateInput,
    tx: Prisma.TransactionClient | PrismaClient = this.prisma,
  ) {
    return tx.serviceImage.create({ data });
  }

  async update(
    id: string,
    data: Prisma.ServiceImageUpdateInput,
    tx: Prisma.TransactionClient | PrismaClient = this.prisma,
  ) {
    return tx.serviceImage.update({ where: { id }, data });
  }

  async delete(
    id: string,
    tx: Prisma.TransactionClient | PrismaClient = this.prisma,
  ) {
    return tx.serviceImage.delete({ where: { id } });
  }

  async unsetPrimary(
    serviceId: string,
    tx: Prisma.TransactionClient | PrismaClient = this.prisma,
  ) {
    return tx.serviceImage.updateMany({
      where: { serviceId, isPrimary: true },
      data: { isPrimary: false },
    });
  }

  async findNextCandidate(
    serviceId: string,
    excludeId: string | undefined,
    tx: Prisma.TransactionClient | PrismaClient = this.prisma,
  ) {
    return tx.serviceImage.findFirst({
      where: {
        serviceId,
        ...(excludeId ? { NOT: { id: excludeId } } : {}),
      },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    });
  }
}