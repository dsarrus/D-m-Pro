// apps/api/src/modules/services/dtos/service.dto.ts

import { z } from "zod";
import { uuidSchema, moneySchema, currencySchema, optionalString } from "../../catalog/dto/common.dto";

export const pricingModelSchema = z.enum(["QUOTE", "FIXED", "HOURLY"]);
export const serviceStatusSchema = z.enum(["DRAFT", "ACTIVE", "INACTIVE", "ARCHIVED"]);

const slugSchema = z
  .string()
  .trim()
  .min(3)
  .max(200)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug invalide.");

/* ================================================================
 * IMAGES
 * ================================================================ */

export const serviceImageSchema = z.object({
  objectKey: z.string().trim().min(1).max(500),
  altText: optionalString(255),
  sortOrder: z.number().int().min(0).default(0),
  isPrimary: z.boolean().default(false),
});

/* ================================================================
 * ZONES
 * ================================================================ */

export const serviceZoneSchema = z
  .object({
    city: optionalString(100),
    region: optionalString(100),
    radiusKm: z.number().int().min(1).max(500).optional().nullable(),
  })
  .refine(
    (data) => data.city || data.region || data.radiusKm,
    "Une zone doit avoir au moins une ville, région ou rayon.",
  );

/* ================================================================
 * AVAILABILITIES
 * ================================================================ */

export const availabilitySchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6).optional().nullable(),
  startTime: z.string().regex(/^\d{2}:\d{2}$/).optional().nullable(),
  endTime: z.string().regex(/^\d{2}:\d{2}$/).optional().nullable(),
  specificDate: z.string().date().optional().nullable(),
  isRecurring: z.boolean().default(true),
});

/* ================================================================
 * SERVICE — Création simple
 * ================================================================ */

export const createServiceSchema = z
  .object({
    categoryId: uuidSchema,
    name: z.string().trim().min(2).max(180),
    slug: slugSchema,
    description: optionalString(10000),

    pricingModel: pricingModelSchema.default("QUOTE"),
    basePrice: moneySchema.optional().nullable(),
    currency: currencySchema.default("XOF"),

    durationMin: z.number().int().min(1).max(10000).optional().nullable(),

    status: serviceStatusSchema.default("DRAFT"),
  })
  .superRefine((data, ctx) => {
    if (data.pricingModel !== "QUOTE" && data.basePrice == null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["basePrice"],
        message: "Le prix de base est requis pour un modèle FIXED ou HOURLY.",
      });
    }
  });

/* ================================================================
 * SERVICE — Création complète (avec images, zones, availabilities)
 * ================================================================ */

export const createServiceFullSchema = createServiceSchema.extend({
  images: z.array(serviceImageSchema).max(20).optional(),
  zones: z.array(serviceZoneSchema).max(50).optional(),
  availabilities: z.array(availabilitySchema).max(50).optional(),
});

/* ================================================================
 * SERVICE — Update
 * ================================================================ */

export const updateServiceSchema = z.object({
  categoryId: uuidSchema.optional(),
  name: z.string().trim().min(2).max(180).optional(),
  slug: slugSchema.optional(),
  description: optionalString(10000),
  pricingModel: pricingModelSchema.optional(),
  basePrice: moneySchema.optional().nullable(),
  currency: currencySchema.optional(),
  durationMin: z.number().int().min(1).max(10000).optional().nullable(),
  status: serviceStatusSchema.optional(),
});

/* ================================================================
 * REORDER
 * ================================================================ */

export const reorderImagesSchema = z.object({
  imageIds: z.array(uuidSchema).min(1),
});

/* ================================================================
 * PARAMS & QUERY
 * ================================================================ */

export const serviceIdParamSchema = z.object({ id: uuidSchema });
export const imageIdParamSchema = z.object({ imageId: uuidSchema });
export const zoneIdParamSchema = z.object({ zoneId: uuidSchema });
export const availabilityIdParamSchema = z.object({ availabilityId: uuidSchema });

export const listServicesQuerySchema = z.object({
  categoryId: uuidSchema.optional(),
  professionalId: uuidSchema.optional(),
  status: serviceStatusSchema.optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  cursor: uuidSchema.optional(),
});

/* ================================================================
 * TYPES
 * ================================================================ */

export type CreateServiceDto = z.infer<typeof createServiceSchema>;
export type CreateServiceFullDto = z.infer<typeof createServiceFullSchema>;
export type UpdateServiceDto = z.infer<typeof updateServiceSchema>;
export type ServiceImageDto = z.infer<typeof serviceImageSchema>;
export type ServiceZoneDto = z.infer<typeof serviceZoneSchema>;
export type AvailabilityDto = z.infer<typeof availabilitySchema>;
export type ListServicesQuery = z.infer<typeof listServicesQuerySchema>;