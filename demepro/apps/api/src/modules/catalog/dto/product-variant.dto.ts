// apps/api/src/modules/catalog/dtos/product-variant.dto.ts

import { z } from "zod";
import { moneySchema, currencySchema, uuidSchema } from "./common.dto";

export const createProductVariantSchema = z.object({
  name: z.string().trim().min(1).max(180),

  sku: z.string().trim().min(1).max(100).optional().nullable(),

  price: moneySchema,

  currency: currencySchema.default("XOF"),

  attributes: z
    .record(
      z.string(),
      z.union([z.string(), z.number(), z.boolean(), z.null()]),
    )
    .optional()
    .nullable(),

  isActive: z.boolean().default(true),

  /** Stock initial pour cette variante. */
  inventory: z.number().int().min(0).default(0),
});

/**
 * Update : on retire `inventory` car le stock
 * se modifie via InventoryService, pas via updateVariant.
 */
export const updateProductVariantSchema = createProductVariantSchema
  .omit({ inventory: true })
  .partial();

export const variantIdParamSchema = z.object({
  id: uuidSchema,
});

export type CreateProductVariantDto = z.infer<
  typeof createProductVariantSchema
>;

export type UpdateProductVariantDto = z.infer<
  typeof updateProductVariantSchema
>;
