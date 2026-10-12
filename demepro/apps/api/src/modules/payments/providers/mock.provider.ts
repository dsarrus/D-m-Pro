// apps/api/src/modules/payment/providers/mock.provider.ts

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
  process.env.PAYMENT_WEBHOOK_SECRET ?? "dev-mock-secret";

/* ================================================================
 * PROVIDER
 * ================================================================ */

/**
 * Provider mocké pour le développement et les tests.
 *
 * Simule le comportement d'Orange Money / Wave :
 *  - `initiate` retourne un `providerRef` et un `redirectUrl`
 *  - `verifyWebhook` vérifie la signature HMAC-SHA256
 *  - `refund` retourne un `refundRef` factice
 *
 * Expose un helper `signWebhookPayload` pour générer
 * des webhooks valides dans les tests.
 */
export class MockProvider implements PaymentProviderInterface {
  public readonly name = "MOCK" as const;
  public readonly requiresWebhook = true;

  async initiate(
    params: InitiatePaymentParams,
  ): Promise<InitiatePaymentResult> {
    const providerRef = `mock_${params.paymentId}_${Date.now()}`;

    return {
      providerRef,
      redirectUrl: `https://mock.payment.local/pay/${providerRef}`,
      metadata: {
        mock: true,
        amount: params.amount,
        currency: params.currency,
        orderId: params.orderId,
      },
    };
  }

  async verifyWebhook(
    params: VerifyWebhookParams,
  ): Promise<VerifyWebhookResult> {
    /* ----- 1. Vérifier la signature ----- */
    if (!params.signature) {
      throw new Error("Missing webhook signature.");
    }

    const expectedSignature = this.computeSignature(params.rawBody);

    if (!timingSafeEqual(params.signature, expectedSignature)) {
      throw new Error("Invalid webhook signature.");
    }

    /* ----- 2. Parser le body ----- */
    const payload = JSON.parse(params.rawBody) as {
      providerRef: string;
      status: "PAID" | "FAILED" | "REFUNDED";
      amount: number;
      metadata?: Record<string, unknown>;
    };

    if (!payload.providerRef || !payload.status) {
      throw new Error("Invalid webhook payload.");
    }

    return {
      providerRef: payload.providerRef,
      status: payload.status,
      amount: payload.amount,
      metadata: payload.metadata,
    };
  }

  async refund(params: RefundParams): Promise<RefundResult> {
    return {
      refundRef: `mock_refund_${params.providerRef}_${Date.now()}`,
      status: "SUCCEEDED",
    };
  }

  /* ================================================================
   * HELPERS PUBLICS (pour les tests)
   * ================================================================ */

  /**
   * Calcule la signature HMAC-SHA256 du body.
   */
  public computeSignature(rawBody: string): string {
    return createHmac("sha256", WEBHOOK_SECRET)
      .update(rawBody)
      .digest("hex");
  }

  /**
   * Génère un webhook signé prêt à être envoyé.
   *
   * Utilisé dans les tests pour simuler un webhook valide.
   */
  public signWebhookPayload(payload: {
    providerRef: string;
    status: "PAID" | "FAILED" | "REFUNDED";
    amount: number;
    metadata?: Record<string, unknown>;
  }): { body: string; signature: string } {
    const body = JSON.stringify(payload);
    const signature = this.computeSignature(body);
    return { body, signature };
  }
}

/* ================================================================
 * UTILITAIRE — Comparaison constant-time
 * ================================================================ */

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}