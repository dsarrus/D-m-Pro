// apps/api/src/modules/payment/providers/wave.provider.ts

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

const WEBHOOK_SECRET =
  process.env.PAYMENT_WEBHOOK_SECRET ?? "dev-wave-secret";

/**
 * Provider Wave.
 *
 * ⚠️ STUB — À brancher avec la vraie API Wave.
 */
export class WaveProvider implements PaymentProviderInterface {
  public readonly name = "WAVE" as const;
  public readonly requiresWebhook = true;

  async initiate(
    params: InitiatePaymentParams,
  ): Promise<InitiatePaymentResult> {
    const providerRef = `wave_${params.paymentId}_${Date.now()}`;

    return {
      providerRef,
      redirectUrl: `https://wave.local/pay/${providerRef}`,
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
    return {
      refundRef: `wave_refund_${params.providerRef}_${Date.now()}`,
      status: "SUCCEEDED",
    };
  }
}