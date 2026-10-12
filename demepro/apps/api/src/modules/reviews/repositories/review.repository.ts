// apps/api/src/modules/review/repositories/review.repository.ts

import { Prisma, PrismaClient } from "../../../generated/prisma/client";

export class ReviewRepository {
  constructor(private readonly prisma: PrismaClient) {}

  /* ================================================================
   * LECTURES
   * ================================================================ */

  async findById(
    id: string,
    tx: Prisma.TransactionClient | PrismaClient = this.prisma,
  ) {
    return tx.review.findUnique({
      where: { id },
      include: {
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        order: {
          select: { id: true, userId: true, status: true },
        },
        reports: true,
      },
    });
  }

  async findByOrderId(
    orderId: string,
    tx: Prisma.TransactionClient | PrismaClient = this.prisma,
  ) {
    return tx.review.findUnique({
      where: { orderId },
    });
  }

  async listByProduct(
    productId: string,
    options: {
      minRating?: number;
      limit?: number;
      cursor?: string | null;
    } = {},
    tx: Prisma.TransactionClient | PrismaClient = this.prisma,
  ) {
    const limit = Math.min(options.limit ?? 20, 100);

    return tx.review.findMany({
      where: {
        productId,
        isVisible: true,
        status: "APPROVED",
        ...(options.minRating
          ? { rating: { gte: options.minRating } }
          : {}),
      },
      include: {
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: limit + 1,
      ...(options.cursor ? { cursor: { id: options.cursor }, skip: 1 } : {}),
    });
  }

  async listByStore(
    storeId: string,
    options: {
      minRating?: number;
      limit?: number;
      cursor?: string | null;
    } = {},
    tx: Prisma.TransactionClient | PrismaClient = this.prisma,
  ) {
    const limit = Math.min(options.limit ?? 20, 100);

    return tx.review.findMany({
      where: {
        storeId,
        isVisible: true,
        status: "APPROVED",
        ...(options.minRating
          ? { rating: { gte: options.minRating } }
          : {}),
      },
      include: {
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: limit + 1,
      ...(options.cursor ? { cursor: { id: options.cursor }, skip: 1 } : {}),
    });
  }

  async listByProfessional(
    professionalId: string,
    options: {
      minRating?: number;
      limit?: number;
      cursor?: string | null;
    } = {},
    tx: Prisma.TransactionClient | PrismaClient = this.prisma,
  ) {
    const limit = Math.min(options.limit ?? 20, 100);

    return tx.review.findMany({
      where: {
        professionalId,
        isVisible: true,
        status: "APPROVED",
        ...(options.minRating
          ? { rating: { gte: options.minRating } }
          : {}),
      },
      include: {
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: limit + 1,
      ...(options.cursor ? { cursor: { id: options.cursor }, skip: 1 } : {}),
    });
  }

  /* ================================================================
   * STATISTIQUES
   * ================================================================ */

  async getAggregateByProduct(
    productId: string,
    tx: Prisma.TransactionClient | PrismaClient = this.prisma,
  ) {
    return tx.review.aggregate({
      where: {
        productId,
        isVisible: true,
        status: "APPROVED",
      },
      _avg: { rating: true },
      _count: { _all: true },
    });
  }

  async getAggregateByStore(
    storeId: string,
    tx: Prisma.TransactionClient | PrismaClient = this.prisma,
  ) {
    return tx.review.aggregate({
      where: {
        storeId,
        isVisible: true,
        status: "APPROVED",
      },
      _avg: { rating: true },
      _count: { _all: true },
    });
  }

  async getAggregateByProfessional(
    professionalId: string,
    tx: Prisma.TransactionClient | PrismaClient = this.prisma,
  ) {
    return tx.review.aggregate({
      where: {
        professionalId,
        isVisible: true,
        status: "APPROVED",
      },
      _avg: { rating: true },
      _count: { _all: true },
    });
  }

  /**
   * Distribution des notes (1-5) pour un produit ou une boutique.
   */
  async getRatingDistribution(
    filter: {
      productId?: string;
      storeId?: string;
      professionalId?: string;
    },
    tx: Prisma.TransactionClient | PrismaClient = this.prisma,
  ) {
    const rows = await tx.review.groupBy({
      by: ["rating"],
      where: {
        ...filter,
        isVisible: true,
        status: "APPROVED",
      },
      _count: { _all: true },
    });

    const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

    for (const row of rows) {
      distribution[row.rating as 1 | 2 | 3 | 4 | 5] = row._count._all;
    }

    return distribution;
  }

  /* ================================================================
   * ÉCRITURES
   * ================================================================ */

  async create(
    data: Prisma.ReviewCreateInput,
    tx: Prisma.TransactionClient | PrismaClient = this.prisma,
  ) {
    return tx.review.create({ data });
  }

  async update(
    id: string,
    data: Prisma.ReviewUpdateInput,
    tx: Prisma.TransactionClient | PrismaClient = this.prisma,
  ) {
    return tx.review.update({
      where: { id },
      data,
    });
  }

  async delete(
    id: string,
    tx: Prisma.TransactionClient | PrismaClient = this.prisma,
  ) {
    return tx.review.delete({ where: { id } });
  }

  /* ================================================================
   * REPORTS
   * ================================================================ */

  async findReportById(
    id: string,
    tx: Prisma.TransactionClient | PrismaClient = this.prisma,
  ) {
    return tx.reviewReport.findUnique({
      where: { id },
      include: {
        review: {
          select: { id: true, authorId: true, isVisible: true },
        },
      },
    });
  }

  async findReportByReviewAndReporter(
    reviewId: string,
    reporterId: string,
    tx: Prisma.TransactionClient | PrismaClient = this.prisma,
  ) {
    return tx.reviewReport.findFirst({
      where: { reviewId, reporterId },
    });
  }

  async createReport(
    data: Prisma.ReviewReportCreateInput,
    tx: Prisma.TransactionClient | PrismaClient = this.prisma,
  ) {
    return tx.reviewReport.create({ data });
  }

  async updateReport(
    id: string,
    data: Prisma.ReviewReportUpdateInput,
    tx: Prisma.TransactionClient | PrismaClient = this.prisma,
  ) {
    return tx.reviewReport.update({
      where: { id },
      data,
    });
  }

  async listPendingReports(
    tx: Prisma.TransactionClient | PrismaClient = this.prisma,
  ) {
    return tx.reviewReport.findMany({
      where: { status: "PENDING" },
      include: {
        review: {
          select: {
            id: true,
            rating: true,
            comment: true,
            authorId: true,
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });
  }
}