// apps/api/src/modules/category/dtos/category.dto.ts

import { z } from "zod";

export const categoryTypeSchema = z.enum(["SERVICE", "PRODUCT", "BOTH"]);
export const categoryStatusSchema = z.enum([
  "ACTIVE",
  "INACTIVE",
  "ARCHIVED",
]);

const slugSchema = z
  .string()
  .trim()
  .min(2)
  .max(150)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug invalide.");

/* ================================================================
 * CREATE
 * ================================================================ */

export const createCategorySchema = z.object({
  verticalId: z.string().uuid(),
  parentId: z.string().uuid().optional().nullable(),

  name: z.string().trim().min(2).max(120),
  slug: slugSchema,
  description: z.string().trim().max(10000).optional().nullable(),

  type: categoryTypeSchema.default("BOTH"),
  status: categoryStatusSchema.default("ACTIVE"),
  sortOrder: z.number().int().min(0).default(0),

  imageKey: z.string().trim().max(500).optional().nullable(),
});

/* ================================================================
 * UPDATE
 * ================================================================ */

export const updateCategorySchema = z
  .object({
    name: z.string().trim().min(2).max(120).optional(),
    slug: slugSchema.optional(),
    description: z.string().trim().max(10000).optional().nullable(),
    type: categoryTypeSchema.optional(),
    status: categoryStatusSchema.optional(),
    sortOrder: z.number().int().min(0).optional(),
    imageKey: z.string().trim().max(500).optional().nullable(),
  })
  .refine(
    (data) => Object.keys(data).length > 0,
    "Aucune donnée à mettre à jour.",
  );

/* ================================================================
 * PARAMS
 * ================================================================ */

export const categoryIdParamSchema = z.object({
  id: z.string().uuid(),
});

/* ================================================================
 * LIST QUERY
 * ================================================================ */

export const listCategoriesQuerySchema = z.object({
  verticalId: z.string().uuid().optional(),
  parentId: z.string().uuid().optional().nullable(),
  type: categoryTypeSchema.optional(),
  status: categoryStatusSchema.optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  cursor: z.string().uuid().optional(),
});

/* ================================================================
 * TYPES
 * ================================================================ */

export type CreateCategoryDto = z.infer<typeof createCategorySchema>;
export type UpdateCategoryDto = z.infer<typeof updateCategorySchema>;
export type ListCategoriesQuery = z.infer<typeof listCategoriesQuerySchema>;