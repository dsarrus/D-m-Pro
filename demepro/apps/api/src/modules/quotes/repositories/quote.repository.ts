// apps/api/src/modules/quotes/repositories/quote.repository.ts

import { Prisma, PrismaClient } from "../../../generated/prisma/client";

export class QuoteRepository {
  constructor(private readonly prisma: PrismaClient) {}

  /* ================================================================
   * LECTURES
   * ================================================================ */

  async findById(
    id: string,
    tx: Prisma.TransactionClient | PrismaClient = this.prisma,
  ) {
    return tx.quote.findUnique({
      where: { id },
      include: {
        service: {
          select: {
            id: true,
            name: true,
            slug: true,
            professionalId: true,
            professional: {
              select: { userId: true },
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
        response: true,
        booking: {
          select: { id: true, status: true, scheduledAt: true },
        },
      },
    });
  }

  async listByUser(
    userId: string,
    options: {
      status?: string;
      limit?: number;
      cursor?: string | null;
    } = {},
    tx: Prisma.TransactionClient | PrismaClient = this.prisma,
  ) {
    const limit = Math.min(options.limit ?? 20, 100);

    return tx.quote.findMany({
      where: {
        userId,
        ...(options.status ? { status: options.status as any } : {}),
      },
      include: {
        service: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        response: true,
      },
      orderBy: { createdAt: "desc" },
      take: limit + 1,
      ...(options.cursor ? { cursor: { id: options.cursor }, skip: 1 } : {}),
    });
  }

  async listByProfessional(
    professionalId: string,
    options: {
      status?: string;
      limit?: number;
      cursor?: string | null;
    } = {},
    tx: Prisma.TransactionClient | PrismaClient = this.prisma,
  ) {
    const limit = Math.min(options.limit ?? 20, 100);

    return tx.quote.findMany({
      where: {
        service: { professionalId },
        ...(options.status ? { status: options.status as any } : {}),
      },
      include: {
        service: {
          select: { id: true, name: true, slug: true },
        },
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        response: true,
      },
      orderBy: { createdAt: "desc" },
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

    return tx.quote.findMany({
      where: {
        serviceId,
        ...(options.status ? { status: options.status as any } : {}),
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        response: true,
      },
      orderBy: { createdAt: "desc" },
      take: limit + 1,
      ...(options.cursor ? { cursor: { id: options.cursor }, skip: 1 } : {}),
    });
  }

  /**
   * Compte les devis PENDING ou RESPONDED dont la date d'expiration
   * est dépassée.
   */
  async findExpired(
  tx: Prisma.TransactionClient | PrismaClient = this.prisma,
) {
  const now = new Date();
  return tx.quote.findMany({
    where: {
      OR: [
        // Devis PENDING dont la date d'expiration est dépassée
        { status: "PENDING", expiresAt: { lt: now } },
        // Devis RESPONDED dont la réponse est expirée
        { status: "RESPONDED", response: { expiresAt: { lt: now } } },
        // Devis RESPONDED dont le Quote.expiresAt est dépassé
        { status: "RESPONDED", expiresAt: { lt: now } },
      ],
    },
  });
}

  /* ================================================================
   * ÉCRITURES
   * ================================================================ */

  async create(
    data: Prisma.QuoteCreateInput,
    tx: Prisma.TransactionClient | PrismaClient = this.prisma,
  ) {
    return tx.quote.create({
      data,
      include: {
        service: {
          select: { id: true, name: true, slug: true },
        },
      },
    });
  }

  async update(
    id: string,
    data: Prisma.QuoteUpdateInput,
    tx: Prisma.TransactionClient | PrismaClient = this.prisma,
  ) {
    return tx.quote.update({
      where: { id },
      data,
    });
  }

  /* ================================================================
   * QUOTE RESPONSE
   * ================================================================ */

  async findResponseByQuoteId(
    quoteId: string,
    tx: Prisma.TransactionClient | PrismaClient = this.prisma,
  ) {
    return tx.quoteResponse.findUnique({
      where: { quoteId },
    });
  }

  async createResponse(
    data: Prisma.QuoteResponseCreateInput,
    tx: Prisma.TransactionClient | PrismaClient = this.prisma,
  ) {
    return tx.quoteResponse.create({ data });
  }
}