// apps/api/src/modules/services/repositories/service-zone.repository.ts

import { Prisma, PrismaClient } from "../../../generated/prisma/client";

export class ServiceZoneRepository {
  constructor(private readonly prisma: PrismaClient) {}

  /* ================================================================
   * LECTURES
   * ================================================================ */

  async findById(
    id: string,
    tx: Prisma.TransactionClient | PrismaClient = this.prisma,
  ) {
    return tx.serviceZone.findUnique({ where: { id } });
  }

  async listByService(
    serviceId: string,
    tx: Prisma.TransactionClient | PrismaClient = this.prisma,
  ) {
    return tx.serviceZone.findMany({
      where: { serviceId },
      orderBy: { createdAt: "asc" },
    });
  }

  async countByService(
    serviceId: string,
    tx: Prisma.TransactionClient | PrismaClient = this.prisma,
  ) {
    return tx.serviceZone.count({ where: { serviceId } });
  }

  /* ================================================================
   * ÉCRITURES
   * ================================================================ */

  async create(
    data: Prisma.ServiceZoneCreateInput,
    tx: Prisma.TransactionClient | PrismaClient = this.prisma,
  ) {
    return tx.serviceZone.create({ data });
  }

  async createMany(
    data: Prisma.ServiceZoneCreateManyInput[],
    tx: Prisma.TransactionClient | PrismaClient = this.prisma,
  ) {
    return tx.serviceZone.createMany({ data });
  }

  async delete(
    id: string,
    tx: Prisma.TransactionClient | PrismaClient = this.prisma,
  ) {
    return tx.serviceZone.delete({ where: { id } });
  }

  async deleteByServiceId(
    serviceId: string,
    tx: Prisma.TransactionClient | PrismaClient = this.prisma,
  ) {
    return tx.serviceZone.deleteMany({ where: { serviceId } });
  }
}