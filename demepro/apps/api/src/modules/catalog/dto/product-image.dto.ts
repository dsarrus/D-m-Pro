// apps/api/src/modules/catalog/dto/product-image.dto.ts

import { z } from "zod";
import { uuidSchema, optionalString } from "./common.dto";

export const createProductImageSchema = z.object({
  objectKey: z.string().trim().min(1).max(500),
  altText: optionalString(255),
  sortOrder: z.number().int().min(0).default(0),
  isPrimary: z.boolean().default(false),
});

export const updateProductImageSchema = createProductImageSchema.partial();

export const imageIdParamSchema = z.object({
  id: uuidSchema,
});

export type CreateProductImageDto = z.infer<typeof createProductImageSchema>;
export type UpdateProductImageDto = z.infer<typeof updateProductImageSchema>;
