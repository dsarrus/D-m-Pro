// apps/api/src/modules/catalog/dto/product.dto.ts

import { z } from "zod";
import {
  uuidSchema,
  slugSchema,
  moneySchema,
  currencySchema,
  optionalString,
} from "./common.dto";
import { createProductImageSchema } from "./product-image.dto";
import { createProductVariantSchema } from "./product-variant.dto";

export const productStatusSchema = z.enum([
  "DRAFT",
  "ACTIVE",
  "OUT_OF_STOCK",
  "INACTIVE",
  "ARCHIVED",
]);

/* ================================================================
 * Base — champs communs, SANS superRefine
 * ================================================================ */

const productBaseShape = {
  storeId: uuidSchema,
  categoryId: uuidSchema,
  name: z.string().trim().min(2, "Le nom est obligatoire").max(200),
  slug: slugSchema,
  description: optionalString(10000),
  sku: z.string().trim().min(1).max(100).optional().nullable(),
  status: productStatusSchema.default("DRAFT"),
  hasVariants: z.boolean().default(false),
  price: moneySchema.optional().nullable(),
  currency: currencySchema.default("XOF"),
};

/* ================================================================
 * 1. POST /products — produit nu (PAS de variants autorisés)
 * ================================================================ */

export const createProductSchema = z
  .object(productBaseShape)
  .superRefine((data, ctx) => {
    /* Produit simple → price obligatoire */
    if (!data.hasVariants && data.price == null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["price"],
        message: "Le prix est obligatoire pour un produit sans variantes",
      });
    }

    /* ⚠️ Cet endpoint ne crée PAS de variantes */
    if (data.hasVariants) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["hasVariants"],
        message:
          "Cet endpoint ne crée pas de variantes. Utilisez POST /products/full.",
      });
    }

    if (data.hasVariants && data.price != null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["price"],
        message:
          "Le prix du produit doit être null lorsqu'il possède des variantes",
      });
    }
  });

/* ================================================================
 * 2. POST /products/full — produit complet avec variants + images + inventory
 * ================================================================ */

/**
 * Variante enrichie avec son stock initial.
 */
const createProductVariantInlineSchema = createProductVariantSchema.extend({
  inventory: z.number().int().min(0).default(0),
});

export const createProductWithRelationsSchema = z
  .object({
    ...productBaseShape,

    /* Stock initial pour produit SIMPLE */
    inventory: z.number().int().min(0).optional(),

    /* Variantes initiales */
    variants: z
      .array(createProductVariantInlineSchema)
      .max(100)
      .optional(),

    /* Images initiales */
    images: z.array(createProductImageSchema).max(20).optional(),
  })
  .superRefine((data, ctx) => {
    /* ----- Règles hasVariants ----- */

    if (data.hasVariants) {
      /* variants obligatoires */
      if (!data.variants || data.variants.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["variants"],
          message:
            "Un produit avec variantes doit contenir au moins une variante.",
        });
      }

      /* pas d'inventory direct */
      if (data.inventory != null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["inventory"],
          message:
            "Un produit avec variantes ne doit pas définir de stock direct. Utilisez variants[].inventory.",
        });
      }

      /* pas de price direct */
      if (data.price != null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["price"],
          message:
            "Un produit avec variantes ne doit pas définir de prix direct.",
        });
      }
    } else {
      /* Produit simple → variants interdits */
      if (data.variants && data.variants.length > 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["variants"],
          message:
            "Un produit sans variantes ne doit pas contenir de variantes.",
        });
      }

      /* price obligatoire */
      if (data.price == null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["price"],
          message: "Le prix est obligatoire pour un produit sans variantes",
        });
      }
    }

    /* ----- Unicité SKU intra-requête ----- */

    if (data.variants) {
      const skus = data.variants
        .map((v) => v.sku)
        .filter((sku): sku is string => Boolean(sku));

      const seen = new Set<string>();
      const duplicates = new Set<string>();
      for (const sku of skus) {
        if (seen.has(sku)) duplicates.add(sku);
        seen.add(sku);
      }

      if (duplicates.size > 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["variants"],
          message: `SKU dupliqués dans la requête : ${[...duplicates].join(", ")}`,
        });
      }
    }

    /* ----- Une seule image primaire ----- */

    if (data.images) {
      const primaries = data.images.filter((i) => i.isPrimary);
      if (primaries.length > 1) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["images"],
          message: "Une seule image peut être primaire.",
        });
      }
    }
  });

/* ================================================================
 * 3. Update
 * ================================================================ */

export const updateProductSchema = z
  .object({
    categoryId: uuidSchema.optional(),
    name: z.string().trim().min(2).max(200).optional(),
    slug: slugSchema.optional(),
    description: optionalString(10000),
    sku: z.string().trim().min(1).max(100).optional().nullable(),
    status: productStatusSchema.optional(),
    hasVariants: z.boolean().optional(),
    price: moneySchema.optional().nullable(),
    currency: currencySchema.optional(),
  })
  .superRefine((data, ctx) => {
    if (data.hasVariants === true && data.price != null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["price"],
        message: "Un produit avec variantes ne doit pas avoir de prix direct",
      });
    }
  });

/* ================================================================
 * 4. Schémas de params
 * ================================================================ */

export const productIdParamSchema = z.object({
  id: uuidSchema,
});

/**
 * ⚠️ Pour les routeurs imbriqués : /products/:productId/...
 */
export const nestedProductIdParamSchema = z.object({
  productId: uuidSchema,
});

/* ================================================================
 * 5. Schémas d'action
 * ================================================================ */

export const disableVariantsSchema = z.object({
  price: moneySchema,
});

/* ================================================================
 * 6. Types
 * ================================================================ */

export type CreateProductDto = z.infer<typeof createProductSchema>;
export type CreateProductWithRelationsDto = z.infer<
  typeof createProductWithRelationsSchema
>;
export type UpdateProductDto = z.infer<typeof updateProductSchema>;