// apps/api/src/modules/quotes/dtos/quote.dto.ts

import { z } from "zod";
import { uuidSchema, moneySchema } from "../../catalog/dto/common.dto";

/* ================================================================
 * CREATE QUOTE
 * ================================================================ */

export const createQuoteSchema = z.object({
  serviceId: uuidSchema,
  description: z.string().trim().min(10).max(2000),
  budget: moneySchema.optional().nullable(),
  preferredDate: z.string().datetime().optional().nullable(),
});

/* ================================================================
 * RESPOND QUOTE
 * ================================================================ */

export const respondToQuoteSchema = z.object({
  proposedPrice: moneySchema,
  message: z.string().trim().max(2000).optional().nullable(),
  proposedDate: z.string().datetime().optional().nullable(),
  validityDays: z.number().int().min(1).max(90).default(7),
});

/* ================================================================
 * ACCEPT / REJECT
 * ================================================================ */

export const acceptQuoteSchema = z.object({
  scheduledAt: z.string().datetime(),
  address: z.string().trim().min(5).max(500).optional().nullable(),
  notes: z.string().trim().max(1000).optional().nullable(),
});

export const rejectQuoteSchema = z.object({
  reason: z.string().trim().max(500).optional().nullable(),
});

/* ================================================================
 * PARAMS & QUERY
 * ================================================================ */

export const quoteIdParamSchema = z.object({
  id: uuidSchema,
});

export const serviceIdParamSchema = z.object({
  serviceId: uuidSchema,
});

export const listQuotesQuerySchema = z.object({
  status: z
    .enum([
      "PENDING",
      "RESPONDED",
      "ACCEPTED",
      "REJECTED",
      "EXPIRED",
      "CONVERTED",
    ])
    .optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  cursor: uuidSchema.optional(),
});

/* ================================================================
 * TYPES
 * ================================================================ */

export type CreateQuoteDto = z.infer<typeof createQuoteSchema>;
export type RespondToQuoteDto = z.infer<typeof respondToQuoteSchema>;
export type AcceptQuoteDto = z.infer<typeof acceptQuoteSchema>;
export type RejectQuoteDto = z.infer<typeof rejectQuoteSchema>;
export type ListQuotesQuery = z.infer<typeof listQuotesQuerySchema>;