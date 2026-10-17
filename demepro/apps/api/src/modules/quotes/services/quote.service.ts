// apps/api/src/modules/quotes/services/quote.service.ts

import { Prisma, PrismaClient } from "../../../generated/prisma/client";

import { QuoteRepository } from "../repositories/quote.repository";
import { QuoteError, QuoteErrorCode } from "../errors/quote.error";

import { NotificationService } from "../../notifications/services/notification.service";

import type {
  CreateQuoteDto,
  RespondToQuoteDto,
  AcceptQuoteDto,
  RejectQuoteDto,
  ListQuotesQuery,
} from "../dtos/quote.dto";

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
const DEFAULT_QUOTE_EXPIRY_DAYS = 7;

/* ================================================================
 * SERVICE
 * ================================================================ */

export class QuoteService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly repository: QuoteRepository,
    private readonly notificationService?: NotificationService,
  ) {}

  /* ================================================================
   * HELPERS PRIVÉS
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

  private async loadAuthorizedQuote(
    db: Prisma.TransactionClient | PrismaClient,
    quoteId: string,
    ctx: AuthContext,
  ) {
    const quote = await db.quote.findUnique({
      where: { id: quoteId },
      include: {
        service: {
          select: {
            id: true,
            name: true,
            professionalId: true,
            professional: {
              select: { userId: true },
            },
          },
        },
      },
    });

    if (!quote) {
      throw new QuoteError(
        QuoteErrorCode.QUOTE_NOT_FOUND,
        "Devis introuvable.",
      );
    }

    const isClient = quote.userId === ctx.userId;
    const isServiceOwner =
      quote.service.professional.userId === ctx.userId;
  const isAdmin = ctx.role === "ADMIN" || ctx.role === "SUPER_ADMIN";

    if (!isClient && !isServiceOwner && !isAdmin) {
      throw new QuoteError(
        QuoteErrorCode.UNAUTHORIZED_QUOTE,
        "Vous n'êtes pas autorisé à accéder à ce devis.",
      );
    }

    return quote;
  }

  private assertQuoteNotExpired(quote: { expiresAt: Date; status: string }) {
    if (quote.expiresAt < new Date()) {
      throw new QuoteError(
        QuoteErrorCode.QUOTE_EXPIRED,
        "Ce devis a expiré.",
      );
    }
  }

  private assertTransition(
    from: string,
    to: string,
    transitions: Record<string, string[]>,
  ): void {
    const allowed = transitions[from] ?? [];
    if (!allowed.includes(to)) {
      throw new QuoteError(
        QuoteErrorCode.QUOTE_INVALID_STATE,
        `Transition invalide : ${from} → ${to}.`,
      );
    }
  }

  private static readonly TRANSITIONS: Record<string, string[]> = {
    PENDING: ["RESPONDED", "REJECTED", "EXPIRED"],
    RESPONDED: ["ACCEPTED", "REJECTED", "EXPIRED"],
    ACCEPTED: ["CONVERTED"],
    REJECTED: [],
    EXPIRED: [],
    CONVERTED: [],
  };

  /* ================================================================
   * CREATE QUOTE
   * ================================================================ */

  /**
   * Le client envoie une demande de devis pour un service.
   */
  async createQuote(dto: CreateQuoteDto, ctx: AuthContext) {
    try {
      const quote = await this.withSerializableRetry(() =>
        this.prisma.$transaction(
          async (tx) => {
            /* ----- 1. Charger le service ----- */
            const service = await tx.service.findUnique({
              where: { id: dto.serviceId },
              select: {
                id: true,
                status: true,
                professionalId: true,
                professional: {
                  select: { userId: true },
                },
              },
            });

            if (!service) {
              throw new QuoteError(
                QuoteErrorCode.SERVICE_NOT_FOUND,
                "Service introuvable.",
              );
            }

            if (service.status !== "ACTIVE") {
              throw new QuoteError(
                QuoteErrorCode.SERVICE_NOT_ACTIVE,
                "Ce service n'est pas disponible.",
              );
            }

            /* Empêcher un pro de demander un devis sur son propre service */
            if (service.professional.userId === ctx.userId) {
              throw new QuoteError(
                QuoteErrorCode.UNAUTHORIZED_QUOTE,
                "Vous ne pouvez pas demander un devis sur votre propre service.",
              );
            }

            /* ----- 2. Calculer expiresAt ----- */
            const expiresAt = new Date();
            expiresAt.setDate(
              expiresAt.getDate() + DEFAULT_QUOTE_EXPIRY_DAYS,
            );

            /* ----- 3. Créer le Quote ----- */
            return tx.quote.create({
              data: {
                service: { connect: { id: dto.serviceId } },
                user: { connect: { id: ctx.userId } },
                description: dto.description,
                budget:
                  dto.budget != null
                    ? new Prisma.Decimal(dto.budget)
                    : null,
                status: "PENDING",
                expiresAt,
              },
              include: {
                service: {
                  select: { id: true, name: true, slug: true },
                },
              },
            });
          },
          {
            isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
            timeout: TRANSACTION_TIMEOUT_MS,
          },
        ),
      );

      /* Notification hors transaction */
      if (this.notificationService) {
        void this.notificationService
          .notifyQuoteReceived(quote.id)
          .catch((err) =>
            console.warn("[QuoteService] notifyQuoteReceived failed:", err),
          );
      }

      return quote;
    } catch (error) {
      if (error instanceof QuoteError) throw error;
      throw error;
    }
  }

  /* ================================================================
   * RESPOND TO QUOTE
   * ================================================================ */

  /**
   * Le professionnel propriétaire du service répond avec un prix.
   */
  async respondToQuote(
    quoteId: string,
    dto: RespondToQuoteDto,
    ctx: AuthContext,
  ) {
    try {
      const result = await this.withSerializableRetry(() =>
        this.prisma.$transaction(
          async (tx) => {
            const quote = await this.loadAuthorizedQuote(tx, quoteId, ctx);

            /* Seul le pro propriétaire peut répondre */
            if (quote.service.professional.userId !== ctx.userId) {
              throw new QuoteError(
                QuoteErrorCode.UNAUTHORIZED_SERVICE,
                "Seul le professionnel peut répondre à ce devis.",
              );
            }

            this.assertTransition(
              quote.status,
              "RESPONDED",
              QuoteService.TRANSITIONS,
            );

            this.assertQuoteNotExpired(quote);

            /* Vérifier qu'aucune réponse n'existe déjà */
            const existing = await tx.quoteResponse.findUnique({
              where: { quoteId },
            });

            if (existing) {
              throw new QuoteError(
                QuoteErrorCode.QUOTE_ALREADY_RESPONDED,
                "Une réponse existe déjà pour ce devis.",
              );
            }

            /* Calculer expiresAt de la réponse */
            const expiresAt = new Date();
            expiresAt.setDate(
              expiresAt.getDate() + dto.validityDays,
            );

            /* Créer la QuoteResponse */
            const response = await tx.quoteResponse.create({
              data: {
                quote: { connect: { id: quoteId } },
    professional: { connect: { id: quote.service.professionalId } }, 
                proposedPrice: new Prisma.Decimal(dto.proposedPrice),
                currency: "XOF",
                message: dto.message ?? null,
                proposedDate: dto.proposedDate
                  ? new Date(dto.proposedDate)
                  : null,
                expiresAt,
              },
            });

            /* Mettre à jour le Quote */
            // Note : on prolonge expiresAt du Quote avec celui de la réponse
// pour que le client ne puisse pas accepter après expiration de la réponse.
            const updated = await tx.quote.update({
  where: { id: quoteId },
  data: {
    status: "RESPONDED",   // ✅ RESPONDED
    expiresAt,             // ✅ prolonge la validité
  },
  include: {
    response: true,
    service: { select: { id: true, name: true, slug: true } },
  },
});

            return { quote: updated, response };
          },
          {
            isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
            timeout: TRANSACTION_TIMEOUT_MS,
          },
        ),
      );

      if (this.notificationService) {
        void this.notificationService
          .notifyQuoteResponded(quoteId)
          .catch((err) =>
            console.warn("[QuoteService] notifyQuoteResponded failed:", err),
          );
      }

      return result;
    } catch (error) {
      if (error instanceof QuoteError) throw error;
      throw error;
    }
  }

  /* ================================================================
   * ACCEPT QUOTE → Convert to Booking
   * ================================================================ */

  /**
   * Le client accepte le devis.
   *
   * Effets (dans une seule transaction) :
   *  - Créer un Booking (CONFIRMED)
   *  - Passer Quote à CONVERTED
   *  - Lier Quote.bookingId
   */
  async acceptQuote(
    quoteId: string,
    dto: AcceptQuoteDto,
    ctx: AuthContext,
  ) {
    try {
      const result = await this.withSerializableRetry(() =>
        this.prisma.$transaction(
          async (tx) => {
            const quote = await this.loadAuthorizedQuote(tx, quoteId, ctx);

            /* Seul le client peut accepter */
            if (quote.userId !== ctx.userId) {
              throw new QuoteError(
                QuoteErrorCode.UNAUTHORIZED_QUOTE,
                "Seul le client peut accepter ce devis.",
              );
            }

            this.assertTransition(
              quote.status,
              "ACCEPTED",
              QuoteService.TRANSITIONS,
            );

            this.assertQuoteNotExpired(quote);

            /* Charger la réponse */
            const response = await tx.quoteResponse.findUnique({
              where: { quoteId },
            });

            if (!response) {
              throw new QuoteError(
                QuoteErrorCode.QUOTE_RESPONSE_NOT_FOUND,
                "Aucune réponse pour ce devis.",
              );
            }

            /* Vérifier que la réponse n'a pas expiré */
            if (response.expiresAt < new Date()) {
              throw new QuoteError(
                QuoteErrorCode.QUOTE_EXPIRED,
                "La réponse à ce devis a expiré.",
              );
            }

            /* Vérifier le créneau */
            const scheduledAt = new Date(dto.scheduledAt);

            if (scheduledAt <= new Date()) {
              throw new QuoteError(
                QuoteErrorCode.INVALID_QUOTE_DATE,
                "La date planifiée doit être dans le futur.",
              );
            }

            /* Vérifier que le créneau n'est pas déjà pris */
            const conflict = await tx.booking.findFirst({
              where: {
                serviceId: quote.serviceId,
                scheduledAt,
                status: { in: ["CONFIRMED", "IN_PROGRESS"] },
              },
            });

            if (conflict) {
              throw new QuoteError(
                QuoteErrorCode.INVALID_QUOTE_DATE,
                "Ce créneau est déjà réservé pour ce service.",
              );
            }

            /* Créer le Booking */
            const booking = await tx.booking.create({
              data: {
                service: { connect: { id: quote.serviceId } },
                user: { connect: { id: quote.userId } },
                quote: { connect: { id: quoteId } },
                status: "CONFIRMED",
                scheduledAt,
                address: dto.address ?? null,
                notes: dto.notes ?? null,
                totalAmount: response.proposedPrice,
                currency: response.currency,
              },
            });

            /* Passer le Quote à CONVERTED */
            const updated = await tx.quote.update({
              where: { id: quoteId },
              data: {
                status: "CONVERTED",
              },
              include: {
                response: true,
                booking: true,
                service: {
                  select: { id: true, name: true, slug: true },
                },
              },
            });

            return { quote: updated, booking };
          },
          {
            isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
            timeout: TRANSACTION_TIMEOUT_MS,
          },
        ),
      );

      if (this.notificationService) {
        void this.notificationService
          .notifyQuoteAccepted(quoteId)
          .catch((err) =>
            console.warn("[QuoteService] notifyQuoteAccepted failed:", err),
          );
      }

      return result;
    } catch (error) {
      if (error instanceof QuoteError) throw error;
      throw error;
    }
  }

  /* ================================================================
   * REJECT QUOTE
   * ================================================================ */

  async rejectQuote(
    quoteId: string,
    dto: RejectQuoteDto,
    ctx: AuthContext,
  ) {
    try {
      return await this.withSerializableRetry(() =>
        this.prisma.$transaction(
          async (tx) => {
            const quote = await this.loadAuthorizedQuote(tx, quoteId, ctx);

            /* Seul le client peut refuser */
            if (quote.userId !== ctx.userId) {
              throw new QuoteError(
                QuoteErrorCode.UNAUTHORIZED_QUOTE,
                "Seul le client peut refuser ce devis.",
              );
            }

            this.assertTransition(
              quote.status,
              "REJECTED",
              QuoteService.TRANSITIONS,
            );

            return tx.quote.update({
              where: { id: quoteId },
              data: { status: "REJECTED" },
            });
          },
          {
            isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
            timeout: TRANSACTION_TIMEOUT_MS,
          },
        ),
      );
    } catch (error) {
      if (error instanceof QuoteError) throw error;
      throw error;
    }
  }

  /* ================================================================
   * EXPIRE OVERDUE QUOTES
   * ================================================================ */

  /**
   * Marque comme EXPIRED tous les devis dont la date d'expiration est dépassée.
   *
   * À appeler par un job (cron) externe.
   */
  async expireOverdueQuotes(): Promise<{ count: number }> {
    const expired = await this.repository.findExpired();

    if (expired.length === 0) {
      return { count: 0 };
    }

    const ids = expired.map((q) => q.id);

    await this.prisma.quote.updateMany({
      where: { id: { in: ids } },
      data: { status: "EXPIRED" },
    });

    return { count: expired.length };
  }

  /* ================================================================
   * GET / LIST
   * ================================================================ */

  async getQuote(quoteId: string, ctx: AuthContext) {
    await this.loadAuthorizedQuote(this.prisma, quoteId, ctx);
    return this.repository.findById(quoteId);
  }

  async listMyQuotes(ctx: AuthContext, query: ListQuotesQuery) {
    const results = await this.repository.listByUser(ctx.userId, query);

    const limit = Math.min(query.limit ?? 20, 100);
    const hasMore = results.length > limit;
    const data = hasMore ? results.slice(0, limit) : results;

    return {
      data,
      hasMore,
      nextCursor: hasMore ? data[data.length - 1]?.id ?? null : null,
    };
  }

  async listProfessionalQuotes(ctx: AuthContext, query: ListQuotesQuery) {
    const professional = await this.prisma.professionalProfile.findUnique({
      where: { userId: ctx.userId },
      select: { id: true },
    });

    if (!professional) {
      throw new QuoteError(
        QuoteErrorCode.UNAUTHORIZED_SERVICE,
        "Profil professionnel introuvable.",
      );
    }

    const results = await this.repository.listByProfessional(
      professional.id,
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

  async listServiceQuotes(
    serviceId: string,
    ctx: AuthContext,
    query: ListQuotesQuery,
  ) {
    /* Vérifier ownership du service */
    const service = await this.prisma.service.findUnique({
      where: { id: serviceId },
      select: {
        professional: {
          select: { userId: true },
        },
      },
    });

    if (!service || service.professional.userId !== ctx.userId) {
      throw new QuoteError(
        QuoteErrorCode.UNAUTHORIZED_SERVICE,
        "Vous n'êtes pas autorisé à consulter les devis de ce service.",
      );
    }

    const results = await this.repository.listByService(serviceId, query);

    const limit = Math.min(query.limit ?? 20, 100);
    const hasMore = results.length > limit;
    const data = hasMore ? results.slice(0, limit) : results;

    return {
      data,
      hasMore,
      nextCursor: hasMore ? data[data.length - 1]?.id ?? null : null,
    };
  }
}