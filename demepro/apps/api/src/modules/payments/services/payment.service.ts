// apps/api/src/modules/payment/services/payment.service.ts

import { Prisma, PrismaClient } from "../../../generated/prisma/client";

import { PaymentRepository } from "../repositories/payment.repository";
import { PaymentError, PaymentErrorCode } from "../errors/payment.error";

import { getPaymentProvider } from "../providers/provider.factory";
import type { PaymentProviderName } from "../providers/payment-provider.interface";

import { OrderService } from "../../orders/services/order.service";

import type {
  InitiatePaymentDto,
  RefundPaymentDto,
} from "../dtos/payment.dto";

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

export class PaymentService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly repository: PaymentRepository,
    private readonly orderService: OrderService,
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

  /* ================================================================
   * INITIATE
   * ================================================================ */

  /**
   * Initie un paiement pour une commande.
   *
   * Règles :
   *  - La commande doit être PENDING
   *  - Aucun paiement ne doit déjà exister
   *  - Le client doit être propriétaire de la commande
   */
  async initiatePayment(
    orderId: string,
    dto: InitiatePaymentDto,
    ctx: AuthContext,
  ) {
    return this.withSerializableRetry(() =>
      this.prisma.$transaction(
        async (tx) => {
          /* ----- 1. Charger la commande ----- */
          const order = await tx.order.findUnique({
            where: { id: orderId },
            select: {
              id: true,
              userId: true,
              status: true,
              totalAmount: true,
              currency: true,
            },
          });

          if (!order) {
            throw new PaymentError(
              PaymentErrorCode.ORDER_NOT_FOUND,
              "Commande introuvable.",
            );
          }

          if (order.userId !== ctx.userId) {
            throw new PaymentError(
              PaymentErrorCode.UNAUTHORIZED_PAYMENT,
              "Vous n'êtes pas autorisé à payer cette commande.",
            );
          }

          if (order.status !== "PENDING") {
            throw new PaymentError(
              PaymentErrorCode.ORDER_NOT_PAYABLE,
              `La commande n'est pas payable (statut : ${order.status}).`,
            );
          }

          /* ----- 2. Vérifier qu'aucun paiement n'existe ----- */
          const existing = await tx.payment.findUnique({
            where: { orderId },
          });

          if (existing) {
            throw new PaymentError(
              PaymentErrorCode.PAYMENT_ALREADY_EXISTS,
              "Un paiement existe déjà pour cette commande.",
            );
          }

          /* ----- 3. Créer le Payment PENDING ----- */
          const payment = await tx.payment.create({
            data: {
              order: { connect: { id: orderId } },
              amount: order.totalAmount,
              currency: order.currency,
              status: "PENDING",
              provider: dto.provider as PaymentProviderName,
            },
          });

          /* ----- 4. Appeler le provider ----- */
          const provider = getPaymentProvider(payment.provider);

          const result = await provider.initiate({
            paymentId: payment.id,
            orderId: order.id,
            amount: Number(order.totalAmount),
            currency: order.currency,
            returnUrl: dto.returnUrl ?? undefined,
          });

          /* ----- 5. Mettre à jour Payment avec providerRef ----- */
          const updated = await tx.payment.update({
            where: { id: payment.id },
            data: {
              providerRef: result.providerRef,
              status: "PROCESSING",
              metadata: result.metadata as Prisma.InputJsonValue,
            },
          });

          return {
            payment: updated,
            redirectUrl: result.redirectUrl,
          };
        },
        {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
          timeout: TRANSACTION_TIMEOUT_MS,
        },
      ),
    );
  }

  /* ================================================================
   * WEBHOOK
   * ================================================================ */

  /**
   * Traite un webhook de paiement.
   *
   * Idempotent grâce à :
   *  - La contrainte @unique sur `providerRef`
   *  - La vérification du statut actuel du Payment
   *
   * Si le Payment est déjà dans un état terminal, on retourne
   * sans erreur (le webhook a déjà été traité).
   */
  async handleWebhook(
    providerName: string,
    rawBody: string,
    signature?: string,
  ) {
    /* ----- 1. Résoudre le provider ----- */
    const provider = getPaymentProvider(
      providerName as PaymentProviderName,
    );

    /* ----- 2. Vérifier la signature + parser ----- */
    let payload;
    try {
      payload = await provider.verifyWebhook({
        rawBody,
        signature,
      });
    } catch (error) {
      if (error instanceof PaymentError) throw error;
      throw new PaymentError(
        PaymentErrorCode.PAYMENT_WEBHOOK_INVALID_SIGNATURE,
        error instanceof Error ? error.message : "Webhook invalide.",
      );
    }

    /* ----- 3. Charger le Payment par providerRef ----- */
    const payment = await this.repository.findByProviderRef(
      payload.providerRef,
    );

    if (!payment) {
      throw new PaymentError(
        PaymentErrorCode.PAYMENT_NOT_FOUND,
        `Aucun paiement trouvé pour providerRef "${payload.providerRef}".`,
      );
    }

    /* ----- 4. Idempotence : si déjà dans un état terminal, on ignore ----- */
    if (
      payment.status === "PAID" ||
      payment.status === "REFUNDED" ||
      payment.status === "PARTIALLY_REFUNDED"
    ) {
      return {
        payment,
        idempotent: true,
      };
    }

    /* ----- 5. Traiter selon le statut du webhook ----- */
    if (payload.status === "PAID") {
      return this.handlePaidWebhook(payment.id, payload);
    }

    if (payload.status === "FAILED") {
      return this.handleFailedWebhook(payment.id, payload);
    }

    if (payload.status === "REFUNDED") {
      return this.handleRefundedWebhook(payment.id, payload);
    }

    throw new PaymentError(
      PaymentErrorCode.PAYMENT_WEBHOOK_INVALID_PAYLOAD,
      `Statut de webhook inconnu : ${payload.status}.`,
    );
  }

  private async handlePaidWebhook(
    paymentId: string,
    payload: { providerRef: string; amount: number; metadata?: any },
  ) {
    return this.withSerializableRetry(() =>
      this.prisma.$transaction(
        async (tx) => {
          const payment = await tx.payment.findUnique({
            where: { id: paymentId },
            include: { order: true },
          });

          if (!payment) {
            throw new PaymentError(
              PaymentErrorCode.PAYMENT_NOT_FOUND,
              "Paiement introuvable.",
            );
          }

          /* ----- Mettre à jour le Payment ----- */
          const updatedPayment = await tx.payment.update({
            where: { id: paymentId },
            data: {
              status: "PAID",
              paidAt: new Date(),
            },
          });

          /* ----- Marquer la commande comme payée ----- */
          await this.orderService.markAsPaid(payment.orderId, tx);

          return {
            payment: updatedPayment,
            idempotent: false,
          };
        },
        {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
          timeout: TRANSACTION_TIMEOUT_MS,
        },
      ),
    );
  }

  private async handleFailedWebhook(
    paymentId: string,
    payload: { providerRef: string; metadata?: any },
  ) {
    const payment = await this.repository.update(paymentId, {
      status: "FAILED",
      metadata: payload.metadata as Prisma.InputJsonValue,
    });

    return {
      payment,
      idempotent: false,
    };
  }

  private async handleRefundedWebhook(
    paymentId: string,
    payload: { providerRef: string; amount: number; metadata?: any },
  ) {
    const payment = await this.repository.update(paymentId, {
      status: "REFUNDED",
      refundedAt: new Date(),
      metadata: payload.metadata as Prisma.InputJsonValue,
    });

    return {
      payment,
      idempotent: false,
    };
  }

  /* ================================================================
   * REFUND
   * ================================================================ */

  /**
   * Rembourse un paiement.
   *
   * Règles :
   *  - Le paiement doit être PAID
   *  - Seul le client propriétaire ou un admin peut rembourser
   */
  async refundPayment(
    orderId: string,
    dto: RefundPaymentDto,
    ctx: AuthContext,
  ) {
    return this.withSerializableRetry(() =>
      this.prisma.$transaction(
        async (tx) => {
          /* ----- 1. Charger le Payment ----- */
          const payment = await tx.payment.findUnique({
            where: { orderId },
            include: {
              order: {
                select: {
                  id: true,
                  userId: true,
                  status: true,
                },
              },
            },
          });

          if (!payment) {
            throw new PaymentError(
              PaymentErrorCode.PAYMENT_NOT_FOUND,
              "Paiement introuvable.",
            );
          }

          /* ----- 2. Vérifier l'ownership ----- */
          const isOwner = payment.order.userId === ctx.userId;
          const isAdmin =
            ctx.role === "ADMIN" || ctx.role === "SUPER_ADMIN";

          if (!isOwner && !isAdmin) {
            throw new PaymentError(
              PaymentErrorCode.UNAUTHORIZED_PAYMENT,
              "Vous n'êtes pas autorisé à rembourser ce paiement.",
            );
          }

          /* ----- 3. Vérifier le statut ----- */
          if (payment.status !== "PAID") {
            throw new PaymentError(
              PaymentErrorCode.REFUND_NOT_ALLOWED,
              `Le paiement ne peut pas être remboursé (statut : ${payment.status}).`,
            );
          }

          /* ----- 4. Appeler le provider ----- */
          if (!payment.providerRef) {
            throw new PaymentError(
              PaymentErrorCode.PAYMENT_PROVIDER_ERROR,
              "Aucune référence de paiement provider.",
            );
          }

          const provider = getPaymentProvider(payment.provider);
          const refundAmount =
            dto.amount ?? Number(payment.amount);

          const refundResult = await provider.refund({
            providerRef: payment.providerRef,
            amount: refundAmount,
          });

          if (refundResult.status !== "SUCCEEDED") {
            throw new PaymentError(
              PaymentErrorCode.PAYMENT_PROVIDER_ERROR,
              "Le remboursement a échoué côté provider.",
            );
          }

          /* ----- 5. Mettre à jour le Payment ----- */
          const isFullRefund =
            refundAmount >= Number(payment.amount);

          const updated = await tx.payment.update({
            where: { id: payment.id },
            data: {
              status: isFullRefund ? "REFUNDED" : "PARTIALLY_REFUNDED",
              refundedAt: new Date(),
            },
          });

          return {
            payment: updated,
            refundRef: refundResult.refundRef,
          };
        },
        {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
          timeout: TRANSACTION_TIMEOUT_MS,
        },
      ),
    );
  }

  /* ================================================================
   * GET
   * ================================================================ */

  async getPaymentByOrder(orderId: string, ctx: AuthContext) {
    const payment = await this.repository.findByOrderId(orderId);

    if (!payment) {
      throw new PaymentError(
        PaymentErrorCode.PAYMENT_NOT_FOUND,
        "Aucun paiement pour cette commande.",
      );
    }

    /* Vérifier ownership : owner du paiement ou pro de la boutique */
    const isOwner = payment.order.userId === ctx.userId;
    const isStoreOwner =
      payment.order.store?.professional?.userId === ctx.userId;

    if (!isOwner && !isStoreOwner) {
      throw new PaymentError(
        PaymentErrorCode.UNAUTHORIZED_PAYMENT,
        "Vous n'êtes pas autorisé à consulter ce paiement.",
      );
    }

    return payment;
  }
}