/**
 * apps/api/src/modules/catalog/routes/product.routes.ts
 */

import { Router } from "express";

import { ProductController } from "../controllers/product.controller";
import { ProductService } from "../services/product.service";
import { ProductRepository } from "../repositories/product.repository";
import { IdempotencyService } from "../services/idempotency.service";

import { prisma } from "../../../infrastructure/database/prisma";

import {
  createProductSchema,
  createProductWithRelationsSchema,
  updateProductSchema,
  productIdParamSchema,
  disableVariantsSchema,
} from "../dto/product.dto";

import { validate } from "../../../shared/middleware/validate";
import { authenticate } from "../../../shared/middleware/authenticate";
import { requirePermission } from "../../../shared/middleware/require-permission";

const router = Router();

/* ------------------------------------------------------------------
 * Wiring des dépendances
 * ------------------------------------------------------------------ */

const repository = new ProductRepository(prisma);
const idempotency = new IdempotencyService(prisma);
const service = new ProductService(prisma, repository, idempotency);
const controller = new ProductController(service);

/* ------------------------------------------------------------------
 * CREATE — produit nu
 * ------------------------------------------------------------------ */

router.post(
  "/",
  authenticate,
  requirePermission("catalog.product.create"),
  validate(createProductSchema, "body"),
  controller.create,
);

/* ------------------------------------------------------------------
 * CREATE FULL — produit + images + variants + inventories
 * ------------------------------------------------------------------ */

router.post(
  "/full",
  authenticate,
  requirePermission("catalog.product.create"),
  validate(createProductWithRelationsSchema, "body"),
  controller.createFull,
);

/* ------------------------------------------------------------------
 * LIST BY STORE
 * ------------------------------------------------------------------ */

router.get(
  "/store/:storeId",
  authenticate,
  requirePermission("catalog.product.read"),
  controller.listByStore,
);

/* ------------------------------------------------------------------
 * GET
 * ------------------------------------------------------------------ */

router.get(
  "/:id",
  validate(productIdParamSchema, "params"),
  controller.getById,
);

/* ------------------------------------------------------------------
 * UPDATE
 * ------------------------------------------------------------------ */

router.patch(
  "/:id",
  authenticate,
  requirePermission("catalog.product.update"),
  validate(productIdParamSchema, "params"),
  validate(updateProductSchema, "body"),
  controller.update,
);

/* ------------------------------------------------------------------
 * VARIANTS — bascule
 * ------------------------------------------------------------------ */

router.post(
  "/:id/enable-variants",
  authenticate,
  requirePermission("catalog.product.update"),
  validate(productIdParamSchema, "params"),
  controller.enableVariants,
);

router.post(
  "/:id/disable-variants",
  authenticate,
  requirePermission("catalog.product.update"),
  validate(productIdParamSchema, "params"),
  validate(disableVariantsSchema, "body"),
  controller.disableVariants,
);

/* ------------------------------------------------------------------
 * ACTIVATE
 * ------------------------------------------------------------------ */

router.post(
  "/:id/activate",
  authenticate,
  requirePermission("catalog.product.publish"),
  validate(productIdParamSchema, "params"),
  controller.activate,
);

/* ------------------------------------------------------------------
 * ARCHIVE
 * ------------------------------------------------------------------ */

router.delete(
  "/:id",
  authenticate,
  requirePermission("catalog.product.delete"),
  validate(productIdParamSchema, "params"),
  controller.archive,
);

/* ------------------------------------------------------------------
 * DELETE (hard)
 * ------------------------------------------------------------------ */

router.delete(
  "/:id/hard",
  authenticate,
  requirePermission("catalog.product.delete"),
  validate(productIdParamSchema, "params"),
  controller.delete,
);

export default router;
