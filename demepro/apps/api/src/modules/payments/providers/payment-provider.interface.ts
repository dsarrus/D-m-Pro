// apps/api/src/modules/payment/providers/payment-provider.interface.ts

import type { PaymentProvider } from "../../../generated/prisma/client";

/* ================================================================
 * TYPES DE BASE
 * ================================================================ */

export type PaymentProviderName = PaymentProvider;

/* ================================================================
 * INITIATE
 * ================================================================ */

export type InitiatePaymentParams = {
  paymentId: string;
  orderId: string;
  amount: number;
  currency: string;
  returnUrl?: string;
};

export type InitiatePaymentResult = {
  providerRef: string;
  redirectUrl?: string;
  metadata?: Record<string, unknown>;
};

/* ================================================================
 * WEBHOOK
 * ================================================================ */

export type VerifyWebhookParams = {
  rawBody: string;
  signature?: string;
  headers?: Record<string, string>;
};

export type VerifyWebhookResult = {
  providerRef: string;
  status: "PAID" | "FAILED" | "REFUNDED";
  amount: number;
  metadata?: Record<string, unknown>;
};

/* ================================================================
 * REFUND
 * ================================================================ */

export type RefundParams = {
  providerRef: string;
  amount: number;
};

export type RefundResult = {
  refundRef: string;
  status: "SUCCEEDED" | "FAILED";
};

/* ================================================================
 * INTERFACE
 * ================================================================ */

export interface PaymentProviderInterface {
  readonly name: PaymentProviderName;
  readonly requiresWebhook: boolean;

  initiate(params: InitiatePaymentParams): Promise<InitiatePaymentResult>;
  verifyWebhook(params: VerifyWebhookParams): Promise<VerifyWebhookResult>;
  refund(params: RefundParams): Promise<RefundResult>;
}