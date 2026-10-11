// apps/api/src/modules/orders/dtos/order.dto.ts

import { z } from "zod";

export const orderStatusSchema = z.enum([
  "PENDING",
  "PAID",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
  "REFUNDED",
]);

/* ================================================================
 * CREATE ORDER
 * ================================================================ */

export const createOrderItemSchema = z
  .object({
    productId: z.string().uuid().optional().nullable(),
    variantId: z.string().uuid().optional().nullable(),
    quantity: z.number().int().min(1).max(1000),
  })
  .refine(
    (data) => {
      const hasProduct = Boolean(data.productId);
      const hasVariant = Boolean(data.variantId);
      return (hasProduct && !hasVariant) || (!hasProduct && hasVariant);
    },
    "Un item doit référencer soit un produit, soit une variante.",
  );

export const createOrderSchema = z.object({
  storeId: z.string().uuid(),
  deliveryAddress: z.string().trim().min(5).max(500),
  deliveryFee: z.number().min(0).default(0),
  notes: z.string().trim().max(1000).optional().nullable(),
  currency: z.enum(["XOF", "EUR", "USD"]).default("XOF"),
  items: z.array(createOrderItemSchema).min(1).max(100),
});

/* ================================================================
 * ACTIONS
 * ================================================================ */

export const shipOrderSchema = z.object({
  trackingNumber: z.string().trim().max(100).optional().nullable(),
});

export const cancelOrderSchema = z.object({
  reason: z.string().trim().min(3).max(500),
});

export const deliverOrderSchema = z.object({
  deliveredBy: z.string().trim().max(100).optional().nullable(),
});

/* ================================================================
 * PARAMS
 * ================================================================ */

export const orderIdParamSchema = z.object({
  id: z.string().uuid(),
});

/* ================================================================
 * TYPES
 * ================================================================ */

export type CreateOrderDto = z.infer<typeof createOrderSchema>;
export type ShipOrderDto = z.infer<typeof shipOrderSchema>;
export type CancelOrderDto = z.infer<typeof cancelOrderSchema>;
export type DeliverOrderDto = z.infer<typeof deliverOrderSchema>;