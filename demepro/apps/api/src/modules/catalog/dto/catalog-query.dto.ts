/**
 * apps/api/src/modules/catalog/dto/catalog-query.dto.ts
 */

// DTO : catalog-query.dto

import { z } from "zod";

import { paginationSchema, sortOrderSchema, uuidSchema } from "./common.dto";

export const catalogQuerySchema = paginationSchema
  .extend({
    q: z.string().trim().min(1).max(100).optional(),

    verticalId: uuidSchema.optional(),

    categoryId: uuidSchema.optional(),

    storeId: uuidSchema.optional(),

    professionalId: uuidSchema.optional(),

    status: z.string().optional(),

    minPrice: z.coerce.number().min(0).optional(),

    maxPrice: z.coerce.number().min(0).optional(),

    sort: z
      .enum(["createdAt", "name", "price", "relevance"])
      .default("createdAt"),

    order: sortOrderSchema.default("desc"),
  })
  .superRefine((data, ctx) => {
    if (
      data.minPrice != null &&
      data.maxPrice != null &&
      data.minPrice > data.maxPrice
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["minPrice"],
        message: "Le prix minimum ne peut pas être supérieur au prix maximum",
      });
    }
  });

export type CatalogQueryDto = z.infer<typeof catalogQuerySchema>;
