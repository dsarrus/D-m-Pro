// apps/api/src/modules/orders/repositories/order.repository.ts

import { Prisma, PrismaClient } from "../../../generated/prisma/client";

export class OrderRepository {
  constructor(private readonly prisma: PrismaClient) {}

  /* ================================================================
   * LECTURES
   * ================================================================ */

  async findById(
    id: string,
    tx: Prisma.TransactionClient | PrismaClient = this.prisma,
  ) {
    return tx.order.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            product: { select: { id: true, slug: true } },
            variant: { select: { id: true, sku: true } },
          },
        },
        payment: true,
        statusHistory: {
          orderBy: { changedAt: "asc" },
        },
        store: {
          select: {
            id: true,
            name: true,
            slug: true,
            professionalId: true,
          },
        },
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });
  }

  async findByIdForStore(
    id: string,
    storeId: string,
    tx: Prisma.TransactionClient | PrismaClient = this.prisma,
  ) {
    return tx.order.findFirst({
      where: { id, storeId },
      include: {
        items: true,
        payment: true,
        statusHistory: { orderBy: { changedAt: "asc" } },
        user: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
      },
    });
  }

  async findByIdForUser(
    id: string,
    userId: string,
    tx: Prisma.TransactionClient | PrismaClient = this.prisma,
  ) {
    return tx.order.findFirst({
      where: { id, userId },
      include: {
        items: true,
        payment: true,
        statusHistory: { orderBy: { changedAt: "asc" } },
        store: {
          select: { id: true, name: true, slug: true },
        },
      },
    });
  }

  async listForUser(
    userId: string,
    options: {
      status?: string;
      limit?: number;
      cursor?: string | null;
    } = {},
    tx: Prisma.TransactionClient | PrismaClient = this.prisma,
  ) {
    const limit = Math.min(options.limit ?? 20, 100);

    return tx.order.findMany({
      where: {
        userId,
        ...(options.status ? { status: options.status as any } : {}),
      },
      include: {
        items: { select: { id: true, productName: true, quantity: true } },
        store: { select: { id: true, name: true, slug: true } },
      },
      orderBy: { createdAt: "desc" },
      take: limit + 1,
      ...(options.cursor ? { cursor: { id: options.cursor }, skip: 1 } : {}),
    });
  }

  async listForStore(
    storeId: string,
    options: {
      status?: string;
      limit?: number;
      cursor?: string | null;
    } = {},
    tx: Prisma.TransactionClient | PrismaClient = this.prisma,
  ) {
    const limit = Math.min(options.limit ?? 20, 100);

    return tx.order.findMany({
      where: {
        storeId,
        ...(options.status ? { status: options.status as any } : {}),
      },
      include: {
        items: { select: { id: true, productName: true, quantity: true } },
        user: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: limit + 1,
      ...(options.cursor ? { cursor: { id: options.cursor }, skip: 1 } : {}),
    });
  }

  /* ================================================================
   * ÉCRITURES
   * ================================================================ */

  async create(
    data: Prisma.OrderCreateInput,
    tx: Prisma.TransactionClient | PrismaClient = this.prisma,
  ) {
    return tx.order.create({
      data,
      include: {
        items: true,
        payment: true,
        statusHistory: { orderBy: { changedAt: "asc" } },
      },
    });
  }

  async updateStatus(
    id: string,
    data: Prisma.OrderUpdateInput,
    tx: Prisma.TransactionClient | PrismaClient = this.prisma,
  ) {
    return tx.order.update({
      where: { id },
      data,
      include: {
        items: true,
        payment: true,
        statusHistory: { orderBy: { changedAt: "asc" } },
      },
    });
  }

  /* ================================================================
   * STATUS HISTORY
   * ================================================================ */

  async addStatusHistory(
    data: {
      orderId: string;
      fromStatus: string;
      toStatus: string;
      changedBy?: string | null;
      reason?: string | null;
    },
    tx: Prisma.TransactionClient | PrismaClient = this.prisma,
  ) {
    return tx.orderStatusHistory.create({
      data: {
        orderId: data.orderId,
        fromStatus: data.fromStatus as any,
        toStatus: data.toStatus as any,
        changedBy: data.changedBy ?? null,
        reason: data.reason ?? null,
      },
    });
  }
}