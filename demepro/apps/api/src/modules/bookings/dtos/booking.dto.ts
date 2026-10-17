// apps/api/src/modules/bookings/dtos/booking.dto.ts

import { z } from "zod";
import { uuidSchema, moneySchema } from "../../catalog/dto/common.dto";

/* ================================================================
 * CREATE BOOKING (direct, sans devis)
 * ================================================================ */

export const createBookingSchema = z.object({
  serviceId: uuidSchema,
  scheduledAt: z
    .string()
    .datetime()
    .refine((d) => new Date(d) > new Date(), {
      message: "scheduledAt doit être dans le futur.",
    }),
  durationMin: z.number().int().positive().max(24 * 60).optional().nullable(),
  address: z.string().trim().min(5).max(500).optional().nullable(),
  notes: z.string().trim().max(1000).optional().nullable(),
  totalAmount: moneySchema.optional().nullable(),
});

/* ================================================================
 * ACTIONS
 * ================================================================ */

export const startBookingSchema = z.object({}).strict();

export const completeBookingSchema = z.object({
  notes: z.string().trim().max(1000).optional().nullable(),
});

export const cancelBookingSchema = z.object({
  reason: z.string().trim().max(500).optional().nullable(),
});

export const noShowBookingSchema = z.object({}).strict();

/* ================================================================
 * PARAMS & QUERY
 * ================================================================ */

export const bookingIdParamSchema = z.object({
  id: uuidSchema,
});

export const serviceIdParamSchema = z.object({
  serviceId: uuidSchema,
});

export const listBookingsQuerySchema = z.object({
  status: z
    .enum(["CONFIRMED", "IN_PROGRESS", "COMPLETED", "CANCELLED", "NO_SHOW"])
    .optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  cursor: uuidSchema.optional(),
});

/* ================================================================
 * TYPES
 * ================================================================ */

export type CreateBookingDto = z.infer<typeof createBookingSchema>;
export type StartBookingDto = z.infer<typeof startBookingSchema>;
export type CompleteBookingDto = z.infer<typeof completeBookingSchema>;
export type CancelBookingDto = z.infer<typeof cancelBookingSchema>;
export type NoShowBookingDto = z.infer<typeof noShowBookingSchema>;
export type ListBookingsQuery = z.infer<typeof listBookingsQuerySchema>;