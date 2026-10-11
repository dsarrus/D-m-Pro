// apps/api/src/modules/stores/dtos/store.dto.ts

import { z } from "zod";

export const storeStatusSchema = z.enum([
  "DRAFT",
  "ACTIVE",
  "SUSPENDED",
  "CLOSED",
]);

const slugSchema = z
  .string()
  .trim()
  .min(3)
  .max(200)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug invalide.");

const optionalString = (max: number) =>
  z.string().trim().max(max).optional().nullable();

/* ================================================================
 * CREATE
 * ================================================================ */

export const createStoreSchema = z.object({
  name: z.string().trim().min(2).max(180),
  slug: slugSchema,
  description: optionalString(10000),
  logoKey: optionalString(500),
  bannerKey: optionalString(500),
  latitude: z.number().min(-90).max(90).optional().nullable(),
  longitude: z.number().min(-180).max(180).optional().nullable(),
});

/* ================================================================
 * UPDATE
 * ================================================================ */

export const updateStoreSchema = createStoreSchema.partial();

/* ================================================================
 * PARAMS
 * ================================================================ */

export const storeIdParamSchema = z.object({
  id: z.string().uuid(),
});

export const storeSlugParamSchema = z.object({
  slug: z.string().trim().min(3).max(200),
});

/* ================================================================
 * TYPES
 * ================================================================ */

export type CreateStoreDto = z.infer<typeof createStoreSchema>;
export type UpdateStoreDto = z.infer<typeof updateStoreSchema>;