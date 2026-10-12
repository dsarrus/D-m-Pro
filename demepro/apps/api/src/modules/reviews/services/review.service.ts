// apps/api/src/modules/review/services/review.service.ts

import { Prisma, PrismaClient } from "../../../generated/prisma/client";

import { ReviewRepository } from "../repositories/review.repository";
import { ReviewError, ReviewErrorCode } from "../errors/review.error";

import type {
  CreateReviewDto,
  UpdateReviewDto,
  ReportReviewDto,
  ModerateReviewDto,
  ResolveReportDto,
  ListReviewsQuery,
} from "../dtos/review.dto";

/* ================================================================
 * TYPES
 * ================================================================ */

export type AuthContext = {
  userId: string;
  role?: string;
  permissions?: string[];
};

const SERIALIZABLE_MAX_ATTEMPTS = 3;
const TRANSACTION_TIMEOUT_MS = 15000;
const REVIEW_UPDATE_WINDOW_DAYS = 7;

/* ================================================================
 * SERVICE
 * ================================================================ */

export class ReviewService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly repository: ReviewRepository,
  ) {}

  /* ================================================================
   * HELPERS
   * ================================================================ */

  private async withSerializableRetry<T>(
    fn: () => Promise<T>,
    maxAttempts = SERIALIZABLE_MAX_ATTEMPTS,
  ): Promise<T> {
    let attempt = 0;

    // eslint-disable-next-line no-constant-condition
    while (true) {
      try {
        return await fn();
      } catch (error) {
        attempt++;

        const isSerializationConflict =
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === "P2034";

        if (!isSerializationConflict || attempt >= maxAttempts) {
          throw error;
        }

        const delay =
          Math.min(100 * 2 ** attempt, 2000) +
          Math.floor(Math.random() * 100);

        await new Promise((r) => setTimeout(r, delay));
      }
    }
  }

  /**
   * Recalcule les moyennes de note pour toutes les cibles d'un avis.
   * Appelé après create/update/delete d'un avis.
   */
  private async recomputeRatings(
    review: {
      productId: string | null;
      storeId: string | null;
      professionalId: string | null;
    },
    tx: Prisma.TransactionClient,
  ): Promise<void> {
    /* Product */
    if (review.productId) {
      const agg = await tx.review.aggregate({
        where: {
          productId: review.productId,
          isVisible: true,
          status: "APPROVED",
        },
        _avg: { rating: true },
        _count: { _all: true },
      });

      /* Note : le modèle Product n'a pas ratingAverage/ratingCount pour l'instant.
       * À ajouter si nécessaire dans une prochaine itération. */
    }

    /* Store */
    if (review.storeId) {
      const agg = await tx.review.aggregate({
        where: {
          storeId: review.storeId,
          isVisible: true,
          status: "APPROVED",
        },
        _avg: { rating: true },
        _count: { _all: true },
      });

      await tx.store.update({
        where: { id: review.storeId },
        data: {
          ratingAverage: new Prisma.Decimal(agg._avg.rating ?? 0),
          ratingCount: agg._count._all,
        },
      });
    }

    /* Professional */
    if (review.professionalId) {
      const agg = await tx.review.aggregate({
        where: {
          professionalId: review.professionalId,
          isVisible: true,
          status: "APPROVED",
        },
        _avg: { rating: true },
        _count: { _all: true },
      });

      await tx.professionalProfile.update({
        where: { id: review.professionalId },
        data: {
          ratingAverage: new Prisma.Decimal(agg._avg.rating ?? 0),
          ratingCount: agg._count._all,
        },
      });
    }
  }

  /* ================================================================
   * CREATE
   * ================================================================ */

  /**
   * Crée un avis vérifié.
   *
   * Règles :
   *  - La commande doit être DELIVERED
   *  - La commande doit appartenir à l'auteur
   *  - Un seul avis par commande
   */
  async createReview(dto: CreateReviewDto, ctx: AuthContext) {
    return this.withSerializableRetry(() =>
      this.prisma.$transaction(
        async (tx) => {
          /* ----- 1. Charger la commande ----- */
          const order = await tx.order.findUnique({
            where: { id: dto.orderId },
            select: {
              id: true,
              userId: true,
              status: true,
              storeId: true,
              store: {
                select: { professionalId: true },
              },
              items: {
                select: {
                  productId: true,
                  variantId: true,
                },
              },
            },
          });

          if (!order) {
            throw new ReviewError(
              ReviewErrorCode.ORDER_NOT_FOUND,
              "Commande introuvable.",
            );
          }

          if (order.userId !== ctx.userId) {
            throw new ReviewError(
              ReviewErrorCode.UNAUTHORIZED_REVIEW,
              "Vous n'êtes pas autorisé à laisser un avis sur cette commande.",
            );
          }

          if (order.status !== "DELIVERED") {
            throw new ReviewError(
              ReviewErrorCode.ORDER_NOT_DELIVERED,
              "Vous ne pouvez laisser un avis qu'après livraison.",
            );
          }

          /* ----- 2. Vérifier qu'aucun avis n'existe ----- */
          const existing = await tx.review.findUnique({
            where: { orderId: dto.orderId },
          });

          if (existing) {
            throw new ReviewError(
              ReviewErrorCode.REVIEW_ALREADY_EXISTS,
              "Un avis existe déjà pour cette commande.",
            );
          }

          /* ----- 3. Vérifier les cibles ----- */
          const hasTarget =
            dto.productId ||
            dto.variantId ||
            dto.storeId ||
            dto.professionalId;

          if (!hasTarget) {
            throw new ReviewError(
              ReviewErrorCode.INVALID_REVIEW_TARGET,
              "Un avis doit cibler au moins une entité.",
            );
          }

          /* Si productId est fourni, vérifier qu'il est bien dans la commande */
          if (dto.productId) {
            const belongs = order.items.some(
              (item) => item.productId === dto.productId,
            );
            if (!belongs) {
              throw new ReviewError(
                ReviewErrorCode.INVALID_REVIEW_TARGET,
                "Le produit ciblé n'est pas dans la commande.",
              );
            }
          }

          if (dto.variantId) {
            const belongs = order.items.some(
              (item) => item.variantId === dto.variantId,
            );
            if (!belongs) {
              throw new ReviewError(
                ReviewErrorCode.INVALID_REVIEW_TARGET,
                "La variante ciblée n'est pas dans la commande.",
              );
            }
          }

          /* ----- 4. Créer l'avis ----- */
          const review = await tx.review.create({
            data: {
              author: { connect: { id: ctx.userId } },
              order: { connect: { id: dto.orderId } },

              ...(dto.productId
                ? { product: { connect: { id: dto.productId } } }
                : {}),
              ...(dto.variantId
                ? { variant: { connect: { id: dto.variantId } } }
                : {}),
              ...(dto.storeId
                ? { store: { connect: { id: dto.storeId } } }
                : {}),
              ...(dto.professionalId
                ? {
                    professional: {
                      connect: { id: dto.professionalId },
                    },
                  }
                : {}),

              rating: dto.rating,
              comment: dto.comment ?? null,

              isVerifiedPurchase: true,
              status: "APPROVED",
              isVisible: true,
            },
          });

          /* ----- 5. Recalculer les moyennes ----- */
          await this.recomputeRatings(review, tx);

          return review;
        },
        {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
          timeout: TRANSACTION_TIMEOUT_MS,
        },
      ),
    );
  }

  /* ================================================================
   * UPDATE
   * ================================================================ */

  async updateReview(
    reviewId: string,
    dto: UpdateReviewDto,
    ctx: AuthContext,
  ) {
    return this.withSerializableRetry(() =>
      this.prisma.$transaction(
        async (tx) => {
          const review = await tx.review.findUnique({
            where: { id: reviewId },
          });

          if (!review) {
            throw new ReviewError(
              ReviewErrorCode.REVIEW_NOT_FOUND,
              "Avis introuvable.",
            );
          }

          if (review.authorId !== ctx.userId) {
            throw new ReviewError(
              ReviewErrorCode.UNAUTHORIZED_REVIEW,
              "Vous n'êtes pas autorisé à modifier cet avis.",
            );
          }

          /* Fenêtre de modification */
          const daysSinceCreation =
            (Date.now() - review.createdAt.getTime()) /
            (1000 * 60 * 60 * 24);

          if (daysSinceCreation > REVIEW_UPDATE_WINDOW_DAYS) {
            throw new ReviewError(
              ReviewErrorCode.REVIEW_UPDATE_WINDOW_EXPIRED,
              `Vous ne pouvez modifier un avis que dans les ${REVIEW_UPDATE_WINDOW_DAYS} jours.`,
            );
          }

          const data: Prisma.ReviewUpdateInput = {};

          if (dto.rating !== undefined) data.rating = dto.rating;
          if (dto.comment !== undefined) data.comment = dto.comment;

          const updated = await tx.review.update({
            where: { id: reviewId },
            data,
          });

          /* Recalculer les moyennes */
          await this.recomputeRatings(updated, tx);

          return updated;
        },
        {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
          timeout: TRANSACTION_TIMEOUT_MS,
        },
      ),
    );
  }

  /* ================================================================
   * DELETE
   * ================================================================ */

  /**
   * Supprime un avis.
   *
   * Auteur : soft delete (isVisible = false)
   * Admin  : hard delete
   */
  async deleteReview(reviewId: string, ctx: AuthContext) {
    return this.withSerializableRetry(() =>
      this.prisma.$transaction(
        async (tx) => {
          const review = await tx.review.findUnique({
            where: { id: reviewId },
          });

          if (!review) {
            throw new ReviewError(
              ReviewErrorCode.REVIEW_NOT_FOUND,
              "Avis introuvable.",
            );
          }

          const isAuthor = review.authorId === ctx.userId;
          const isAdmin =
            ctx.role === "ADMIN" || ctx.role === "SUPER_ADMIN";

          if (!isAuthor && !isAdmin) {
            throw new ReviewError(
              ReviewErrorCode.UNAUTHORIZED_REVIEW,
              "Vous n'êtes pas autorisé à supprimer cet avis.",
            );
          }

          /* Auteur : soft delete ; Admin : hard delete */
          if (isAdmin) {
            await tx.review.delete({ where: { id: reviewId } });
          } else {
            await tx.review.update({
              where: { id: reviewId },
              data: { isVisible: false, status: "REJECTED" },
            });
          }

          /* Recalculer les moyennes */
          await this.recomputeRatings(review, tx);

          return { id: reviewId };
        },
        {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
          timeout: TRANSACTION_TIMEOUT_MS,
        },
      ),
    );
  }

  /* ================================================================
   * GET / LIST
   * ================================================================ */

  async getReview(reviewId: string) {
    const review = await this.repository.findById(reviewId);

    if (!review) {
      throw new ReviewError(
        ReviewErrorCode.REVIEW_NOT_FOUND,
        "Avis introuvable.",
      );
    }

    return review;
  }

  async listByProduct(productId: string, query: ListReviewsQuery) {
    const results = await this.repository.listByProduct(productId, query);

    const limit = Math.min(query.limit ?? 20, 100);
    const hasMore = results.length > limit;
    const data = hasMore ? results.slice(0, limit) : results;

    return {
      data,
      hasMore,
      nextCursor: hasMore ? data[data.length - 1]?.id ?? null : null,
    };
  }

  async listByStore(storeId: string, query: ListReviewsQuery) {
    const results = await this.repository.listByStore(storeId, query);

    const limit = Math.min(query.limit ?? 20, 100);
    const hasMore = results.length > limit;
    const data = hasMore ? results.slice(0, limit) : results;

    return {
      data,
      hasMore,
      nextCursor: hasMore ? data[data.length - 1]?.id ?? null : null,
    };
  }

  async listByProfessional(
    professionalId: string,
    query: ListReviewsQuery,
  ) {
    const results = await this.repository.listByProfessional(
      professionalId,
      query,
    );

    const limit = Math.min(query.limit ?? 20, 100);
    const hasMore = results.length > limit;
    const data = hasMore ? results.slice(0, limit) : results;

    return {
      data,
      hasMore,
      nextCursor: hasMore ? data[data.length - 1]?.id ?? null : null,
    };
  }

  /**
   * Retourne un résumé des notes (moyenne + distribution) pour une cible.
   */
  async getRatingSummary(filter: {
    productId?: string;
    storeId?: string;
    professionalId?: string;
  }) {
    const distribution = await this.repository.getRatingDistribution(filter);

    const total = Object.values(distribution).reduce(
      (sum, count) => sum + count,
      0,
    );

    const weightedSum =
      distribution[1] * 1 +
      distribution[2] * 2 +
      distribution[3] * 3 +
      distribution[4] * 4 +
      distribution[5] * 5;

    const average = total > 0 ? weightedSum / total : 0;

    return {
      average: Number(average.toFixed(2)),
      total,
      distribution,
    };
  }

  /* ================================================================
   * REPORT
   * ================================================================ */

  async reportReview(
    reviewId: string,
    dto: ReportReviewDto,
    ctx: AuthContext,
  ) {
    return this.withSerializableRetry(() =>
      this.prisma.$transaction(
        async (tx) => {
          const review = await tx.review.findUnique({
            where: { id: reviewId },
          });

          if (!review) {
            throw new ReviewError(
              ReviewErrorCode.REVIEW_NOT_FOUND,
              "Avis introuvable.",
            );
          }

          /* Un utilisateur ne peut pas signaler son propre avis */
          if (review.authorId === ctx.userId) {
            throw new ReviewError(
              ReviewErrorCode.UNAUTHORIZED_REVIEW,
              "Vous ne pouvez pas signaler votre propre avis.",
            );
          }

          /* Un seul signalement par user par avis */
          const existing =
            await this.repository.findReportByReviewAndReporter(
              reviewId,
              ctx.userId,
              tx,
            );

          if (existing) {
            throw new ReviewError(
              ReviewErrorCode.REPORT_ALREADY_EXISTS,
              "Vous avez déjà signalé cet avis.",
            );
          }

          return this.repository.createReport(
            {
              review: { connect: { id: reviewId } },
              reporterId: ctx.userId,
              reason: dto.reason,
            },
            tx,
          );
        },
        {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
          timeout: TRANSACTION_TIMEOUT_MS,
        },
      ),
    );
  }

  /* ================================================================
   * MODÉRATION (admin)
   * ================================================================ */

  async moderateReview(
    reviewId: string,
    dto: ModerateReviewDto,
    ctx: AuthContext,
  ) {
    if (ctx.role !== "ADMIN" && ctx.role !== "SUPER_ADMIN") {
      throw new ReviewError(
        ReviewErrorCode.UNAUTHORIZED,
        "Action réservée aux administrateurs.",
      );
    }

    return this.withSerializableRetry(() =>
      this.prisma.$transaction(
        async (tx) => {
          const review = await tx.review.findUnique({
            where: { id: reviewId },
          });

          if (!review) {
            throw new ReviewError(
              ReviewErrorCode.REVIEW_NOT_FOUND,
              "Avis introuvable.",
            );
          }

          const isVisible = dto.status === "APPROVED";

          const updated = await tx.review.update({
            where: { id: reviewId },
            data: {
              status: dto.status,
              isVisible,
            },
          });

          /* Recalculer les moyennes */
          await this.recomputeRatings(updated, tx);

          return updated;
        },
        {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
          timeout: TRANSACTION_TIMEOUT_MS,
        },
      ),
    );
  }

  async listPendingReports(ctx: AuthContext) {
    if (ctx.role !== "ADMIN" && ctx.role !== "SUPER_ADMIN") {
      throw new ReviewError(
        ReviewErrorCode.UNAUTHORIZED,
        "Action réservée aux administrateurs.",
      );
    }

    return this.repository.listPendingReports();
  }

  async resolveReport(
    reportId: string,
    dto: ResolveReportDto,
    ctx: AuthContext,
  ) {
    if (ctx.role !== "ADMIN" && ctx.role !== "SUPER_ADMIN") {
      throw new ReviewError(
        ReviewErrorCode.UNAUTHORIZED,
        "Action réservée aux administrateurs.",
      );
    }

    return this.withSerializableRetry(() =>
      this.prisma.$transaction(
        async (tx) => {
          const report = await this.repository.findReportById(
            reportId,
            tx,
          );

          if (!report) {
            throw new ReviewError(
              ReviewErrorCode.REPORT_NOT_FOUND,
              "Signalement introuvable.",
            );
          }

          return this.repository.updateReport(
            reportId,
            {
              status: dto.status,
              resolvedAt: new Date(),
              resolvedBy: ctx.userId,
            },
            tx,
          );
        },
        {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
          timeout: TRANSACTION_TIMEOUT_MS,
        },
      ),
    );
  }
}