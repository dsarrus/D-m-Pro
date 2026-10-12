// apps/api/src/modules/review/dtos/review.dto.ts

import { z } from "zod";

/* ================================================================
 * CREATE
 * ================================================================ */

export const createReviewSchema = z
  .object({
    orderId: z.string().uuid(),

    productId: z.string().uuid().optional().nullable(),
    variantId: z.string().uuid().optional().nullable(),
    storeId: z.string().uuid().optional().nullable(),
    professionalId: z.string().uuid().optional().nullable(),

    rating: z.number().int().min(1).max(5),
    comment: z.string().trim().max(2000).optional().nullable(),
  })
  .superRefine((data, ctx) => {
    const hasTarget =
      data.productId ||
      data.variantId ||
      data.storeId ||
      data.professionalId;

    if (!hasTarget) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["productId"],
        message:
          "Un avis doit cibler au moins un produit, variante, boutique ou professionnel.",
      });
    }
  });

/* ================================================================
 * UPDATE
 * ================================================================ */

export const updateReviewSchema = z.object({
  rating: z.number().int().min(1).max(5).optional(),
  comment: z.string().trim().max(2000).optional().nullable(),
});

/* ================================================================
 * REPORT
 * ================================================================ */

export const reportReviewSchema = z.object({
  reason: z.string().trim().min(5).max(500),
});

/* ================================================================
 * MODERATION (admin)
 * ================================================================ */

export const moderateReviewSchema = z.object({
  status: z.enum(["APPROVED", "REJECTED"]),
  reason: z.string().trim().max(500).optional().nullable(),
});

export const resolveReportSchema = z.object({
  status: z.enum(["RESOLVED", "DISMISSED"]),
});

/* ================================================================
 * PARAMS & QUERY
 * ================================================================ */

export const reviewIdParamSchema = z.object({
  id: z.string().uuid(),
});

export const reportIdParamSchema = z.object({
  reportId: z.string().uuid(),
});

export const listReviewsQuerySchema = z.object({
  productId: z.string().uuid().optional(),
  storeId: z.string().uuid().optional(),
  professionalId: z.string().uuid().optional(),
  minRating: z.coerce.number().int().min(1).max(5).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  cursor: z.string().uuid().optional(),
});

/* ================================================================
 * TYPES
 * ================================================================ */

export type CreateReviewDto = z.infer<typeof createReviewSchema>;
export type UpdateReviewDto = z.infer<typeof updateReviewSchema>;
export type ReportReviewDto = z.infer<typeof reportReviewSchema>;
export type ModerateReviewDto = z.infer<typeof moderateReviewSchema>;
export type ResolveReportDto = z.infer<typeof resolveReportSchema>;
export type ListReviewsQuery = z.infer<typeof listReviewsQuerySchema>;