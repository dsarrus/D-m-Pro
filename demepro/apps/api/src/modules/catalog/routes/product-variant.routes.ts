// apps/api/src/modules/catalog/routes/product-variant.routes.ts

import { Router } from "express";

import { ProductVariantController } from "../controllers/product-variant.controller";
import { ProductVariantService } from "../services/product-variant.service";
import { ProductVariantRepository } from "../repositories/product-variant.repository";
import { IdempotencyService } from "../services/idempotency.service";

import { prisma } from "../../../infrastructure/database/prisma";

import {
  createProductVariantSchema,
  updateProductVariantSchema,
  variantIdParamSchema,
} from "../dto/product-variant.dto";

import {
  nestedProductIdParamSchema,  // ← utiliser CE schéma pour les routes imbriquées
} from "../dto/product.dto";

import { validate } from "../../../shared/middleware/validate";
import { authenticate } from "../../../shared/middleware/authenticate";
import { requirePermission } from "../../../shared/middleware/require-permission";

/* ================================================================
 * WIRING
 * ================================================================ */

const repository = new ProductVariantRepository(prisma);
const idempotency = new IdempotencyService(prisma);
const service = new ProductVariantService(prisma, repository, idempotency);
const controller = new ProductVariantController(service);

/* ================================================================
 * ROUTER IMBRIQUÉ — /products/:productId/variants
 * ================================================================ */

export const productVariantNestedRouter = Router({ mergeParams: true });

/* ------------------------------------------------------------------
 * CREATE
 * ------------------------------------------------------------------ */

productVariantNestedRouter.post(
  "/",
  authenticate,
  requirePermission("catalog.product.update"),
  validate(nestedProductIdParamSchema, "params"),  // ✅ productId
  validate(createProductVariantSchema, "body"),
  controller.create,
);

/* ------------------------------------------------------------------
 * LIST
 * ------------------------------------------------------------------ */

productVariantNestedRouter.get(
  "/",
  authenticate,
  requirePermission("catalog.product.read"),
  validate(nestedProductIdParamSchema, "params"),  // ✅ productId
  controller.listByProduct,
);

/* ================================================================
 * ROUTER DIRECT — /variants/:id
 * ================================================================ */

export const productVariantDirectRouter = Router();

/* ------------------------------------------------------------------
 * GET
 * ------------------------------------------------------------------ */

productVariantDirectRouter.get(
  "/:id",
  validate(variantIdParamSchema, "params"),  // ✅ id
  controller.getById,
);

/* ------------------------------------------------------------------
 * UPDATE
 * ------------------------------------------------------------------ */

productVariantDirectRouter.patch(
  "/:id",
  authenticate,
  requirePermission("catalog.product.update"),
  validate(variantIdParamSchema, "params"),  // ✅ id
  validate(updateProductVariantSchema, "body"),
  controller.update,
);

/* ------------------------------------------------------------------
 * DELETE
 * ------------------------------------------------------------------ */

productVariantDirectRouter.delete(
  "/:id",
  authenticate,
  requirePermission("catalog.product.delete"),
  validate(variantIdParamSchema, "params"),  // ✅ id
  controller.delete,
);

/* ------------------------------------------------------------------
 * ACTIVATE
 * ------------------------------------------------------------------ */

productVariantDirectRouter.post(
  "/:id/activate",
  authenticate,
  requirePermission("catalog.product.publish"),
  validate(variantIdParamSchema, "params"),  // ✅ id
  controller.activate,
);

/* ------------------------------------------------------------------
 * DEACTIVATE
 * ------------------------------------------------------------------ */

productVariantDirectRouter.post(
  "/:id/deactivate",
  authenticate,
  requirePermission("catalog.product.publish"),
  validate(variantIdParamSchema, "params"),  // ✅ id
  controller.deactivate,
);