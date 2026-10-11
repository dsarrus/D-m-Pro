/**
 * apps/api/src/modules/catalog/dto/category.dto.ts
 */

import { z } from "zod";
import { uuidSchema, slugSchema, optionalString } from "./common.dto";

export const categoryTypeSchema = z.enum(["SERVICE", "PRODUCT", "BOTH"]);

export const entityStatusSchema = z.enum(["ACTIVE", "INACTIVE", "ARCHIVED"]);

export const createCategorySchema = z.object({
  verticalId: uuidSchema,

  parentId: uuidSchema.optional().nullable(),

  name: z.string().trim().min(2).max(120),

  slug: slugSchema,

  description: optionalString(5000),

  type: categoryTypeSchema.default("BOTH"),

  status: entityStatusSchema.default("ACTIVE"),

  sortOrder: z.number().int().min(0).default(0),

  imageKey: optionalString(500),
});

export const updateCategorySchema = createCategorySchema.partial().omit({
  verticalId: true,
});

export const categoryIdParamSchema = z.object({
  id: uuidSchema,
});

export type CreateCategoryDto = z.infer<typeof createCategorySchema>;

export type UpdateCategoryDto = z.infer<typeof updateCategorySchema>;
