// apps/api/src/modules/payment/dtos/payment.dto.ts

import { z } from "zod";

export const paymentProviderSchema = z.enum([
  "MOCK",
  "ORANGE_MONEY",
  "WAVE",
]);

/* ================================================================
 * INITIATE
 * ================================================================ */

export const initiatePaymentSchema = z.object({
  provider: paymentProviderSchema,
  returnUrl: z.string().url().optional().nullable(),
});

/* ================================================================
 * REFUND
 * ================================================================ */

export const refundPaymentSchema = z.object({
  amount: z.number().positive().optional(),
  reason: z.string().trim().min(3).max(500).optional(),
});

/* ================================================================
 * PARAMS
 * ================================================================ */

export const orderIdParamSchema = z.object({
  id: z.string().uuid(),
});

export const providerNameParamSchema = z.object({
  provider: z.string().trim().min(1).max(50),
});

/* ================================================================
 * TYPES
 * ================================================================ */

export type InitiatePaymentDto = z.infer<typeof initiatePaymentSchema>;
export type RefundPaymentDto = z.infer<typeof refundPaymentSchema>;