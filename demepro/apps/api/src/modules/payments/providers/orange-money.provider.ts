// apps/api/src/modules/payment/providers/orange-money.provider.ts

import { createHmac } from "node:crypto";

import type {
  InitiatePaymentParams,
  InitiatePaymentResult,
  PaymentProviderInterface,
  RefundParams,
  RefundResult,
  VerifyWebhookParams,
  VerifyWebhookResult,
} from "./payment-provider.interface";

/* ================================================================
 * CONFIG
 * ================================================================ */

const WEBHOOK_SECRET =
  process.env.PAYMENT_WEBHOOK_SECRET ?? "dev-orange-secret";

/* ================================================================
 * PROVIDER
 * ================================================================ */

/**
 * Provider Orange Money.
 *
 * ⚠️ STUB — À brancher avec la vraie API Orange Money.
 *
 * TODO :
 *  - Implémenter l'appel API réel dans `initiate`
 *  - Vérifier la vraie signature dans `verifyWebhook`
 *  - Implémenter le remboursement via l'API Orange
 */
export class OrangeMoneyProvider implements PaymentProviderInterface {
  public readonly name = "ORANGE_MONEY" as const;
  public readonly requiresWebhook = true;

  async initiate(
    params: InitiatePaymentParams,
  ): Promise<InitiatePaymentResult> {
    /* TODO: appeler l'API Orange Money */
    const providerRef = `orange_${params.paymentId}_${Date.now()}`;

    return {
      providerRef,
      redirectUrl: `https://orange-money.local/pay/${providerRef}`,
      metadata: {
        stubbed: true,
        amount: params.amount,
        currency: params.currency,
      },
    };
  }

  async verifyWebhook(
    params: VerifyWebhookParams,
  ): Promise<VerifyWebhookResult> {
    if (!params.signature) {
      throw new Error("Missing webhook signature.");
    }

    const expectedSignature = createHmac("sha256", WEBHOOK_SECRET)
      .update(params.rawBody)
      .digest("hex");

    if (params.signature !== expectedSignature) {
      throw new Error("Invalid webhook signature.");
    }

    const payload = JSON.parse(params.rawBody) as {
      providerRef: string;
      status: "PAID" | "FAILED" | "REFUNDED";
      amount: number;
      metadata?: Record<string, unknown>;
    };

    return {
      providerRef: payload.providerRef,
      status: payload.status,
      amount: payload.amount,
      metadata: payload.metadata,
    };
  }

  async refund(params: RefundParams): Promise<RefundResult> {
    /* TODO: appeler l'API Orange Money */
    return {
      refundRef: `orange_refund_${params.providerRef}_${Date.now()}`,
      status: "SUCCEEDED",
    };
  }
}