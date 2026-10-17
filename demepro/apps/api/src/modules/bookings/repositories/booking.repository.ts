// apps/api/src/modules/bookings/repositories/booking.repository.ts

import { Prisma, PrismaClient } from "../../../generated/prisma/client";

const INCLUDE_LIST = {
  service: {
    select: {
      id: true,
      name: true,
      slug: true,
      professionalId: true,
    },
  },
  user: {
    select: { id: true, firstName: true, lastName: true },
  },
  quote: {
    select: { id: true, status: true },
  },
} as const;

const INCLUDE_DETAIL = {
  service: {
    select: {
      id: true,
      name: true,
      slug: true,
      professionalId: true,
      professional: {
        select: { userId: true, businessName: true },
      },
    },
  },
  user: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
    },
  },
  quote: { select: { id: true, status: true } },
  reviews: {
    select: { id: true, rating: true },
    take: 1,
  },
} as const;

export class BookingRepository {
  constructor(private readonly prisma: PrismaClient) {}

  /* ================================================================
   * LECTURES
   * ================================================================ */

  async findById(
    id: string,
    tx: Prisma.TransactionClient | PrismaClient = this.prisma,
  ) {
    return tx.booking.findUnique({
      where: { id },
      include: INCLUDE_DETAIL,
    });
  }

  async findByQuoteId(
    quoteId: string,
    tx: Prisma.TransactionClient | PrismaClient = this.prisma,
  ) {
    return tx.booking.findUnique({
      where: { quoteId },
      include: INCLUDE_DETAIL,
    });
  }

  async listByUser(
    userId: string,
    options: {
      status?: string;
      from?: Date;
      to?: Date;
      limit?: number;
      cursor?: string | null;
    } = {},
    tx: Prisma.TransactionClient | PrismaClient = this.prisma,
  ) {
    const limit = Math.min(options.limit ?? 20, 100);

    return tx.booking.findMany({
      where: {
        userId,
        ...(options.status ? { status: options.status as any } : {}),
        ...(options.from || options.to
          ? {
              scheduledAt: {
                ...(options.from ? { gte: options.from } : {}),
                ...(options.to ? { lte: options.to } : {}),
              },
            }
          : {}),
      },
      include: INCLUDE_LIST,
      orderBy: { scheduledAt: "desc" },
      take: limit + 1,
      ...(options.cursor ? { cursor: { id: options.cursor }, skip: 1 } : {}),
    });
  }

  async listByProfessional(
    professionalId: string,
    options: {
      status?: string;
      from?: Date;
      to?: Date;
      limit?: number;
      cursor?: string | null;
    } = {},
    tx: Prisma.TransactionClient | PrismaClient = this.prisma,
  ) {
    const limit = Math.min(options.limit ?? 20, 100);

    return tx.booking.findMany({
      where: {
        service: { professionalId },
        ...(options.status ? { status: options.status as any } : {}),
        ...(options.from || options.to
          ? {
              scheduledAt: {
                ...(options.from ? { gte: options.from } : {}),
                ...(options.to ? { lte: options.to } : {}),
              },
            }
          : {}),
      },
      include: INCLUDE_LIST,
      orderBy: { scheduledAt: "desc" },
      take: limit + 1,
      ...(options.cursor ? { cursor: { id: options.cursor }, skip: 1 } : {}),
    });
  }

  async listByService(
    serviceId: string,
    options: {
      status?: string;
      limit?: number;
      cursor?: string | null;
    } = {},
    tx: Prisma.TransactionClient | PrismaClient = this.prisma,
  ) {
    const limit = Math.min(options.limit ?? 20, 100);

    return tx.booking.findMany({
      where: {
        serviceId,
        ...(options.status ? { status: options.status as any } : {}),
      },
      include: INCLUDE_LIST,
      orderBy: { scheduledAt: "desc" },
      take: limit + 1,
      ...(options.cursor ? { cursor: { id: options.cursor }, skip: 1 } : {}),
    });
  }

  /**
   * Cherche un conflit de créneau : même service, même scheduledAt,
   * statut actif (CONFIRMED ou IN_PROGRESS).
   */
  async findSlotConflict(
    serviceId: string,
    scheduledAt: Date,
    excludeBookingId?: string,
    tx: Prisma.TransactionClient | PrismaClient = this.prisma,
  ) {
    return tx.booking.findFirst({
      where: {
        serviceId,
        scheduledAt,
        status: { in: ["CONFIRMED", "IN_PROGRESS"] },
        ...(excludeBookingId ? { id: { not: excludeBookingId } } : {}),
      },
    });
  }

  /* ================================================================
   * ÉCRITURES
   * ================================================================ */

  async create(
    data: Prisma.BookingCreateInput,
    tx: Prisma.TransactionClient | PrismaClient = this.prisma,
  ) {
    return tx.booking.create({
      data,
      include: INCLUDE_DETAIL,
    });
  }

  async update(
    id: string,
    data: Prisma.BookingUpdateInput,
    tx: Prisma.TransactionClient | PrismaClient = this.prisma,
  ) {
    return tx.booking.update({
      where: { id },
      data,
      include: INCLUDE_DETAIL,
    });
  }
}