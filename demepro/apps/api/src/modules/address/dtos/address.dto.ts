// apps/api/src/modules/address/dtos/address.dto.ts

import { z } from "zod";

export const addressTypeSchema = z.enum([
  "HOME",
  "WORK",
  "BILLING",
  "OTHER",
]);

const optionalString = (max: number) =>
  z.string().trim().max(max).optional().nullable();

/* ================================================================
 * CREATE
 * ================================================================ */

export const createAddressSchema = z.object({
  label: z.string().trim().min(1).max(80),
  type: addressTypeSchema.default("HOME"),
  recipientName: z.string().trim().min(2).max(150),
  phone: optionalString(30),

  addressLine1: z.string().trim().min(3).max(255),
  addressLine2: optionalString(255),

  city: z.string().trim().min(2).max(100),
  region: optionalString(100),
  countryCode: z
    .string()
    .trim()
    .length(2)
    .toUpperCase()
    .default("ML"),

  latitude: z.number().min(-90).max(90).optional().nullable(),
  longitude: z.number().min(-180).max(180).optional().nullable(),

  isDefault: z.boolean().default(false),
});

/* ================================================================
 * UPDATE
 * ================================================================ */

export const updateAddressSchema = z.object({
  label: z.string().trim().min(1).max(80).optional(),
  type: addressTypeSchema.optional(),
  recipientName: z.string().trim().min(2).max(150).optional(),
  phone: optionalString(30),
  addressLine1: z.string().trim().min(3).max(255).optional(),
  addressLine2: optionalString(255),
  city: z.string().trim().min(2).max(100).optional(),
  region: optionalString(100),
  countryCode: z.string().trim().length(2).toUpperCase().optional(),
  latitude: z.number().min(-90).max(90).optional().nullable(),
  longitude: z.number().min(-180).max(180).optional().nullable(),
  isDefault: z.boolean().optional(),  // ← PAS de default
});

/* ================================================================
 * PARAMS
 * ================================================================ */

export const addressIdParamSchema = z.object({
  id: z.string().uuid(),
});

/* ================================================================
 * TYPES
 * ================================================================ */

export type CreateAddressDto = z.infer<typeof createAddressSchema>;
export type UpdateAddressDto = z.infer<typeof updateAddressSchema>;