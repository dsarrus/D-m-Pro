// apps/api/src/modules/notifications/repositories/notification.repository.ts

import { Prisma, PrismaClient } from "../../../generated/prisma/client";

export class NotificationRepository {
  constructor(private readonly prisma: PrismaClient) {}

  /* ================================================================
   * LECTURES
   * ================================================================ */

  async findById(
    id: string,
    tx: Prisma.TransactionClient | PrismaClient = this.prisma,
  ) {
    return tx.notification.findUnique({ where: { id } });
  }

  async listByUser(
    userId: string,
    options: {
      unreadOnly?: boolean;
      limit?: number;
      cursor?: string | null;
    } = {},
    tx: Prisma.TransactionClient | PrismaClient = this.prisma,
  ) {
    const limit = Math.min(options.limit ?? 20, 100);

    return tx.notification.findMany({
      where: {
        userId,
        ...(options.unreadOnly ? { readAt: null } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: limit + 1,
      ...(options.cursor ? { cursor: { id: options.cursor }, skip: 1 } : {}),
    });
  }

  async countUnread(
    userId: string,
    tx: Prisma.TransactionClient | PrismaClient = this.prisma,
  ) {
    return tx.notification.count({
      where: { userId, readAt: null },
    });
  }

  /* ================================================================
   * ÉCRITURES
   * ================================================================ */

  async create(
    data: Prisma.NotificationCreateInput,
    tx: Prisma.TransactionClient | PrismaClient = this.prisma,
  ) {
    return tx.notification.create({ data });
  }

  async markAsRead(
    id: string,
    tx: Prisma.TransactionClient | PrismaClient = this.prisma,
  ) {
    return tx.notification.update({
      where: { id },
      data: { readAt: new Date() },
    });
  }

  async markAllAsRead(
    userId: string,
    tx: Prisma.TransactionClient | PrismaClient = this.prisma,
  ) {
    return tx.notification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() },
    });
  }
}