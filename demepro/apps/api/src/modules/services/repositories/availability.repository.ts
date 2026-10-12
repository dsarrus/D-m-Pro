// apps/api/src/modules/services/repositories/availability.repository.ts

import { Prisma, PrismaClient } from "../../../generated/prisma/client";

export class AvailabilityRepository {
  constructor(private readonly prisma: PrismaClient) {}

  /* ================================================================
   * LECTURES
   * ================================================================ */

  async findById(
    id: string,
    tx: Prisma.TransactionClient | PrismaClient = this.prisma,
  ) {
    return tx.availability.findUnique({ where: { id } });
  }

  async listByService(
    serviceId: string,
    tx: Prisma.TransactionClient | PrismaClient = this.prisma,
  ) {
    return tx.availability.findMany({
      where: { serviceId },
      orderBy: [{ isRecurring: "desc" }, { dayOfWeek: "asc" }, { specificDate: "asc" }],
    });
  }

  async countByService(
    serviceId: string,
    tx: Prisma.TransactionClient | PrismaClient = this.prisma,
  ) {
    return tx.availability.count({ where: { serviceId } });
  }

  /**
   * Vérifie qu'il n'y a pas de chevauchement de créneaux récurrents
   * pour un même jour.
   */
  async findOverlappingRecurring(
    serviceId: string,
    dayOfWeek: number,
    startTime: string,
    endTime: string,
    tx: Prisma.TransactionClient | PrismaClient = this.prisma,
  ) {
    return tx.availability.findFirst({
      where: {
        serviceId,
        isRecurring: true,
        dayOfWeek,
        OR: [
          {
            AND: [
              { startTime: { lte: startTime } },
              { endTime: { gt: startTime } },
            ],
          },
          {
            AND: [
              { startTime: { lt: endTime } },
              { endTime: { gte: endTime } },
            ],
          },
          {
            AND: [
              { startTime: { gte: startTime } },
              { endTime: { lte: endTime } },
            ],
          },
        ],
      },
    });
  }

  /**
   * Vérifie qu'il n'y a pas déjà une dispo ponctuelle à cette date.
   */
  async findSpecificDate(
    serviceId: string,
    specificDate: Date,
    tx: Prisma.TransactionClient | PrismaClient = this.prisma,
  ) {
    return tx.availability.findFirst({
      where: {
        serviceId,
        isRecurring: false,
        specificDate,
      },
    });
  }

  /* ================================================================
   * ÉCRITURES
   * ================================================================ */

  async create(
    data: Prisma.AvailabilityCreateInput,
    tx: Prisma.TransactionClient | PrismaClient = this.prisma,
  ) {
    return tx.availability.create({ data });
  }

  async createMany(
    data: Prisma.AvailabilityCreateManyInput[],
    tx: Prisma.TransactionClient | PrismaClient = this.prisma,
  ) {
    return tx.availability.createMany({ data });
  }

  async delete(
    id: string,
    tx: Prisma.TransactionClient | PrismaClient = this.prisma,
  ) {
    return tx.availability.delete({ where: { id } });
  }

  async deleteByServiceId(
    serviceId: string,
    tx: Prisma.TransactionClient | PrismaClient = this.prisma,
  ) {
    return tx.availability.deleteMany({ where: { serviceId } });
  }
}