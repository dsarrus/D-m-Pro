// apps/api/src/modules/bookings/services/booking.service.ts

import { Prisma, PrismaClient } from "../../../generated/prisma/client";

import { BookingRepository } from "../repositories/booking.repository";
import { BookingError, BookingErrorCode } from "../errors/booking.error";

import { NotificationService } from "../../notifications/services/notification.service";

import type {
  CreateBookingDto,
  CompleteBookingDto,
  CancelBookingDto,
  ListBookingsQuery,
} from "../dtos/booking.dto";

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

/* ================================================================
 * SERVICE
 * ================================================================ */

export class BookingService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly repository: BookingRepository,
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

  private async loadAuthorizedBooking(
    db: Prisma.TransactionClient | PrismaClient,
    bookingId: string,
    ctx: AuthContext,
  ) {
    const booking = await db.booking.findUnique({
      where: { id: bookingId },
      include: {
        service: {
          select: {
            id: true,
            name: true,
            professionalId: true,
            professional: { select: { userId: true } },
          },
        },
      },
    });

    if (!booking) {
      throw new BookingError(
        BookingErrorCode.BOOKING_NOT_FOUND,
        "Réservation introuvable.",
      );
    }

    const isClient = booking.userId === ctx.userId;
    const isServiceOwner =
      booking.service.professional.userId === ctx.userId;
    const isAdmin = ctx.role === "ADMIN" || ctx.role === "SUPER_ADMIN";

    if (!isClient && !isServiceOwner && !isAdmin) {
      throw new BookingError(
        BookingErrorCode.UNAUTHORIZED_BOOKING,
        "Vous n'êtes pas autorisé à accéder à cette réservation.",
      );
    }

    return booking;
  }

  private assertTransition(
    from: string,
    to: string,
    transitions: Record<string, string[]>,
  ): void {
    const allowed = transitions[from] ?? [];
    if (!allowed.includes(to)) {
      throw new BookingError(
        BookingErrorCode.BOOKING_INVALID_STATE,
        `Transition invalide : ${from} → ${to}.`,
      );
    }
  }

  private static readonly TRANSITIONS: Record<string, string[]> = {
    CONFIRMED: ["IN_PROGRESS", "CANCELLED", "NO_SHOW"],
    IN_PROGRESS: ["COMPLETED", "CANCELLED"],
    COMPLETED: [],
    CANCELLED: [],
    NO_SHOW: [],
  };

  /* ================================================================
   * CREATE BOOKING (direct)
   * ================================================================ */

  /**
   * Crée un booking direct (service FIXED ou HOURLY, sans devis).
   */
  async createBooking(dto: CreateBookingDto, ctx: AuthContext) {
    const result = await this.withSerializableRetry(() =>
      this.prisma.$transaction(
        async (tx) => {
          /* 1. Charger le service */
          const service = await tx.service.findUnique({
            where: { id: dto.serviceId },
            select: {
              id: true,
              status: true,
              pricingModel: true,
              basePrice: true,
              professionalId: true,
              professional: { select: { userId: true } },
            },
          });

          if (!service) {
            throw new BookingError(
              BookingErrorCode.SERVICE_NOT_FOUND,
              "Service introuvable.",
            );
          }

          if (service.status !== "ACTIVE") {
            throw new BookingError(
              BookingErrorCode.SERVICE_NOT_ACTIVE,
              "Ce service n'est pas disponible.",
            );
          }

          /* Un service QUOTE nécessite un devis, pas un booking direct */
          if (service.pricingModel === "QUOTE") {
            throw new BookingError(
              BookingErrorCode.SERVICE_NOT_BOOKABLE,
              "Ce service nécessite un devis (pricingModel=QUOTE).",
            );
          }

          /* Empêcher le pro de réserver son propre service */
          if (service.professional.userId === ctx.userId) {
            throw new BookingError(
              BookingErrorCode.UNAUTHORIZED_BOOKING,
              "Vous ne pouvez pas réserver votre propre service.",
            );
          }

          /* 2. Date dans le futur */
          const scheduledAt = new Date(dto.scheduledAt);
          if (scheduledAt <= new Date()) {
            throw new BookingError(
              BookingErrorCode.INVALID_BOOKING_DATE,
              "La date planifiée doit être dans le futur.",
            );
          }

          /* 3. Vérifier conflit de créneau */
          const conflict = await this.repository.findSlotConflict(
            service.id,
            scheduledAt,
            undefined,
            tx,
          );
          if (conflict) {
            throw new BookingError(
              BookingErrorCode.BOOKING_SLOT_CONFLICT,
              "Ce créneau est déjà réservé pour ce service.",
            );
          }

          /* 4. Calculer totalAmount */
          const totalAmount =
            dto.totalAmount != null
              ? new Prisma.Decimal(dto.totalAmount)
              : service.basePrice ?? new Prisma.Decimal(0);

          /* 5. Créer le booking */
          return tx.booking.create({
            data: {
              service: { connect: { id: service.id } },
              user: { connect: { id: ctx.userId } },
              status: "CONFIRMED",
              scheduledAt,
              durationMin: dto.durationMin ?? null,
              address: dto.address ?? null,
              notes: dto.notes ?? null,
              totalAmount,
              currency: "XOF",
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

    if (this.notificationService) {
      void this.notificationService
        .notifyBookingCreated(result.id)
        .catch((err) =>
          console.warn("[BookingService] notifyBookingCreated failed:", err),
        );
    }

    return result;
  }

  /* ================================================================
   * START
   * ================================================================ */

  /**
   * Le pro démarre la prestation : CONFIRMED → IN_PROGRESS.
   */
  async startBooking(bookingId: string, ctx: AuthContext) {
    return this.withSerializableRetry(() =>
      this.prisma.$transaction(
        async (tx) => {
          const booking = await this.loadAuthorizedBooking(tx, bookingId, ctx);

          if (booking.service.professional.userId !== ctx.userId) {
            throw new BookingError(
              BookingErrorCode.UNAUTHORIZED_SERVICE,
              "Seul le professionnel peut démarrer cette réservation.",
            );
          }

          this.assertTransition(
            booking.status,
            "IN_PROGRESS",
            BookingService.TRANSITIONS,
          );

          return tx.booking.update({
            where: { id: bookingId },
            data: { status: "IN_PROGRESS" },
          });
        },
        {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
          timeout: TRANSACTION_TIMEOUT_MS,
        },
      ),
    );
  }

  /* ================================================================
   * COMPLETE
   * ================================================================ */

  /**
   * Le pro termine la prestation : IN_PROGRESS → COMPLETED.
   */
  async completeBooking(
    bookingId: string,
    dto: CompleteBookingDto,
    ctx: AuthContext,
  ) {
    const result = await this.withSerializableRetry(() =>
      this.prisma.$transaction(
        async (tx) => {
          const booking = await this.loadAuthorizedBooking(tx, bookingId, ctx);

          if (booking.service.professional.userId !== ctx.userId) {
            throw new BookingError(
              BookingErrorCode.UNAUTHORIZED_SERVICE,
              "Seul le professionnel peut terminer cette réservation.",
            );
          }

          this.assertTransition(
            booking.status,
            "COMPLETED",
            BookingService.TRANSITIONS,
          );

          return tx.booking.update({
            where: { id: bookingId },
            data: {
              status: "COMPLETED",
              completedAt: new Date(),
              ...(dto.notes ? { notes: dto.notes } : {}),
            },
          });
        },
        {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
          timeout: TRANSACTION_TIMEOUT_MS,
        },
      ),
    );

    if (this.notificationService) {
      void this.notificationService
        .notifyBookingCompleted(result.id)
        .catch((err) =>
          console.warn("[BookingService] notifyBookingCompleted failed:", err),
        );
    }

    return result;
  }

  /* ================================================================
   * CANCEL
   * ================================================================ */

  /**
   * Client, pro ou admin annule : CONFIRMED/IN_PROGRESS → CANCELLED.
   */
  async cancelBooking(
    bookingId: string,
    dto: CancelBookingDto,
    ctx: AuthContext,
  ) {
    const result = await this.withSerializableRetry(() =>
      this.prisma.$transaction(
        async (tx) => {
          const booking = await this.loadAuthorizedBooking(tx, bookingId, ctx);

          this.assertTransition(
            booking.status,
            "CANCELLED",
            BookingService.TRANSITIONS,
          );

          return tx.booking.update({
            where: { id: bookingId },
            data: {
              status: "CANCELLED",
              canceledAt: new Date(),
              ...(dto.reason ? { notes: dto.reason } : {}),
            },
          });
        },
        {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
          timeout: TRANSACTION_TIMEOUT_MS,
        },
      ),
    );

    if (this.notificationService) {
      void this.notificationService
        .notifyBookingCancelled(result.id)
        .catch((err) =>
          console.warn("[BookingService] notifyBookingCancelled failed:", err),
        );
    }

    return result;
  }

  /* ================================================================
   * NO-SHOW
   * ================================================================ */

  /**
   * Le pro marque le client comme absent : CONFIRMED → NO_SHOW,
   * uniquement si scheduledAt est passé.
   */
  async noShowBooking(bookingId: string, ctx: AuthContext) {
    return this.withSerializableRetry(() =>
      this.prisma.$transaction(
        async (tx) => {
          const booking = await this.loadAuthorizedBooking(tx, bookingId, ctx);

          if (booking.service.professional.userId !== ctx.userId) {
            throw new BookingError(
              BookingErrorCode.UNAUTHORIZED_SERVICE,
              "Seul le professionnel peut marquer un no-show.",
            );
          }

          this.assertTransition(
            booking.status,
            "NO_SHOW",
            BookingService.TRANSITIONS,
          );

          if (booking.scheduledAt > new Date()) {
            throw new BookingError(
              BookingErrorCode.INVALID_BOOKING_DATE,
              "Le rendez-vous n'a pas encore eu lieu.",
            );
          }

          return tx.booking.update({
            where: { id: bookingId },
            data: { status: "NO_SHOW" },
          });
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

  async getBooking(bookingId: string, ctx: AuthContext) {
    await this.loadAuthorizedBooking(this.prisma, bookingId, ctx);
    return this.repository.findById(bookingId);
  }

  async listMyBookings(ctx: AuthContext, query: ListBookingsQuery) {
    const results = await this.repository.listByUser(ctx.userId, {
      status: query.status,
      from: query.from ? new Date(query.from) : undefined,
      to: query.to ? new Date(query.to) : undefined,
      limit: query.limit,
      cursor: query.cursor,
    });

    return this.paginate(results, query.limit);
  }

  async listProfessionalBookings(ctx: AuthContext, query: ListBookingsQuery) {
    const professional = await this.prisma.professionalProfile.findUnique({
      where: { userId: ctx.userId },
      select: { id: true },
    });

    if (!professional) {
      throw new BookingError(
        BookingErrorCode.UNAUTHORIZED_SERVICE,
        "Profil professionnel introuvable.",
      );
    }

    const results = await this.repository.listByProfessional(professional.id, {
      status: query.status,
      from: query.from ? new Date(query.from) : undefined,
      to: query.to ? new Date(query.to) : undefined,
      limit: query.limit,
      cursor: query.cursor,
    });

    return this.paginate(results, query.limit);
  }

  async listServiceBookings(
    serviceId: string,
    ctx: AuthContext,
    query: ListBookingsQuery,
  ) {
    const service = await this.prisma.service.findUnique({
      where: { id: serviceId },
      select: { professional: { select: { userId: true } } },
    });

    if (!service || service.professional.userId !== ctx.userId) {
      throw new BookingError(
        BookingErrorCode.UNAUTHORIZED_SERVICE,
        "Vous n'êtes pas autorisé à consulter les réservations de ce service.",
      );
    }

    const results = await this.repository.listByService(serviceId, {
      status: query.status,
      limit: query.limit,
      cursor: query.cursor,
    });

    return this.paginate(results, query.limit);
  }

  private paginate(
    results: { id: string }[],
    limitOverride?: number,
  ) {
    const limit = Math.min(limitOverride ?? 20, 100);
    const hasMore = results.length > limit;
    const data = hasMore ? results.slice(0, limit) : results;

    return {
      data,
      hasMore,
      nextCursor: hasMore ? data[data.length - 1]?.id ?? null : null,
    };
  }
}