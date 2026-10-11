/**
 * apps/api/src/modules/catalog/dto/service.dto.ts
 */

import { z } from "zod";

import {
  uuidSchema,
  slugSchema,
  moneySchema,
  currencySchema,
  optionalString,
} from "./common.dto";

export const pricingTypeSchema = z.enum(["FIXED", "FROM", "QUOTE"]);

export const serviceStatusSchema = z.enum([
  "DRAFT",
  "ACTIVE",
  "INACTIVE",
  "ARCHIVED",
]);

export const createServiceSchema = z
  .object({
    professionalId: uuidSchema,

    categoryId: uuidSchema,

    name: z.string().trim().min(2).max(180),

    slug: slugSchema,

    description: optionalString(10000),

    pricingType: pricingTypeSchema.default("QUOTE"),

    price: moneySchema.optional().nullable(),

    currency: currencySchema.default("XOF"),

    status: serviceStatusSchema.default("DRAFT"),

    durationMin: z.number().int().positive().optional().nullable(),

    imageKey: optionalString(500),
  })
  .superRefine((data, ctx) => {
    if (data.pricingType === "FIXED" && data.price == null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["price"],
        message: "Le prix est obligatoire pour un service à tarif fixe",
      });
    }

    if (data.pricingType === "QUOTE" && data.price != null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["price"],
        message: "Un service sur devis ne doit pas avoir de prix",
      });
    }
  });

export const updateServiceSchema = z.object({
  categoryId: uuidSchema.optional(),

  name: z.string().trim().min(2).max(180).optional(),

  slug: slugSchema.optional(),

  description: optionalString(10000),

  pricingType: pricingTypeSchema.optional(),

  price: moneySchema.optional().nullable(),

  currency: currencySchema.optional(),

  status: serviceStatusSchema.optional(),

  durationMin: z.number().int().positive().optional().nullable(),

  imageKey: optionalString(500),
});

export const serviceIdParamSchema = z.object({
  id: uuidSchema,
});

export type CreateServiceDto = z.infer<typeof createServiceSchema>;

export type UpdateServiceDto = z.infer<typeof updateServiceSchema>;
