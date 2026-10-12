// apps/api/src/modules/address/repositories/address.repository.ts

import { Prisma, PrismaClient } from "../../../generated/prisma/client";

const MAX_ADDRESSES_PER_USER = 20;

export class AddressRepository {
  constructor(private readonly prisma: PrismaClient) {}

  /* ================================================================
   * LECTURES
   * ================================================================ */

  async findById(
    id: string,
    tx: Prisma.TransactionClient | PrismaClient = this.prisma,
  ) {
    return tx.address.findUnique({ where: { id } });
  }

  async listByUser(
    userId: string,
    tx: Prisma.TransactionClient | PrismaClient = this.prisma,
  ) {
    return tx.address.findMany({
      where: { userId },
      orderBy: [
        { isDefault: "desc" },
        { createdAt: "desc" },
      ],
    });
  }

  async findDefault(
    userId: string,
    tx: Prisma.TransactionClient | PrismaClient = this.prisma,
  ) {
    return tx.address.findFirst({
      where: { userId, isDefault: true },
    });
  }

  async countByUser(
    userId: string,
    tx: Prisma.TransactionClient | PrismaClient = this.prisma,
  ) {
    return tx.address.count({ where: { userId } });
  }

  /* ================================================================
   * ÉCRITURES
   * ================================================================ */

  async create(
    data: Prisma.AddressCreateInput,
    tx: Prisma.TransactionClient | PrismaClient = this.prisma,
  ) {
    return tx.address.create({ data });
  }

  async update(
    id: string,
    data: Prisma.AddressUpdateInput,
    tx: Prisma.TransactionClient | PrismaClient = this.prisma,
  ) {
    return tx.address.update({
      where: { id },
      data,
    });
  }

  async delete(
    id: string,
    tx: Prisma.TransactionClient | PrismaClient = this.prisma,
  ) {
    return tx.address.delete({ where: { id } });
  }

  /**
   * Retire le flag isDefault de toutes les adresses d'un user.
   */
  async unsetDefault(
    userId: string,
    tx: Prisma.TransactionClient | PrismaClient = this.prisma,
  ) {
    return tx.address.updateMany({
      where: { userId, isDefault: true },
      data: { isDefault: false },
    });
  }

  /* ================================================================
   * CONSTANTES
   * ================================================================ */

  static readonly MAX_ADDRESSES_PER_USER = MAX_ADDRESSES_PER_USER;
}