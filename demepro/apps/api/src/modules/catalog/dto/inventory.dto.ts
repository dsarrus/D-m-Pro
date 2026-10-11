// apps/api/src/modules/catalog/dtos/inventory.dto.ts

import { z } from "zod";
import { uuidSchema } from "./common.dto";

export const setInventoryQuantitySchema = z.object({
  quantity: z.number().int().min(0),
});

export const adjustInventoryQuantitySchema = z.object({
  delta: z
    .number()
    .int()
    .refine((v) => v !== 0, "L'ajustement ne peut pas être égal à zéro."),
});

export const createInventoryBodySchema = z.object({
  quantity: z.number().int().min(0).default(0),
});

export const inventoryIdParamSchema = z.object({
  id: uuidSchema,
});

export const inventoryProductParamSchema = z.object({
  productId: uuidSchema,
});

export const inventoryVariantParamSchema = z.object({
  variantId: uuidSchema,
});

export type SetInventoryQuantityDto = z.infer<
  typeof setInventoryQuantitySchema
>;

export type AdjustInventoryQuantityDto = z.infer<
  typeof adjustInventoryQuantitySchema
>;

export type CreateInventoryBodyDto = z.infer<
  typeof createInventoryBodySchema
>;