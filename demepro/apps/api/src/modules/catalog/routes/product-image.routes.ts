// apps/api/src/modules/catalog/routes/productImage.routes.ts

import { Router } from "express";

import {
  ProductImageController,
  reorderBodySchema,
} from "../controllers/product-image.controller";
import { ProductImageService } from "../services/product-image.service";
import { ProductImageRepository } from "../repositories/product-image.repository";

import { prisma } from "../../../infrastructure/database/prisma";

import {
  createProductImageSchema,
  updateProductImageSchema,
  imageIdParamSchema,
} from "../dto/product-image.dto";

import { nestedProductIdParamSchema  } from "../dto/product.dto";

import { validate } from "../../../shared/middleware/validate";
import { authenticate } from "../../../shared/middleware/authenticate";
import { requirePermission } from "../../../shared/middleware/require-permission";

/* ================================================================
 * WIRING
 * ================================================================ */

const repository = new ProductImageRepository(prisma);
const service = new ProductImageService(prisma, repository);
const controller = new ProductImageController(service);

/* ================================================================
 * ROUTER IMBRIQUÉ — /catalog/products/:productId/images
 * ================================================================ */

export const productImageNestedRouter = Router({ mergeParams: true });

/* ------------------------------------------------------------------
 * CREATE
 * ------------------------------------------------------------------ */

productImageNestedRouter.post(
  "/",
  authenticate,
  requirePermission("catalog.product.update"),
  validate(nestedProductIdParamSchema , "params"),
  validate(createProductImageSchema, "body"),
  controller.create,
);

/* ------------------------------------------------------------------
 * LIST
 * ------------------------------------------------------------------ */

productImageNestedRouter.get(
  "/",
  authenticate,
  requirePermission("catalog.product.read"),
  validate(nestedProductIdParamSchema , "params"),
  controller.listByProduct,
);

/* ------------------------------------------------------------------
 * REORDER
 * ------------------------------------------------------------------ */

productImageNestedRouter.post(
  "/reorder",
  authenticate,
  requirePermission("catalog.product.update"),
  validate(nestedProductIdParamSchema , "params"),
  validate(reorderBodySchema, "body"),
  controller.reorder,
);

/* ================================================================
 * ROUTER DIRECT — /catalog/images/:id
 * ================================================================ */

export const productImageDirectRouter = Router();

/* ------------------------------------------------------------------
 * GET
 * ------------------------------------------------------------------ */

productImageDirectRouter.get(
  "/:id",
  validate(imageIdParamSchema, "params"),
  controller.getById,
);

/* ------------------------------------------------------------------
 * UPDATE
 * ------------------------------------------------------------------ */

productImageDirectRouter.patch(
  "/:id",
  authenticate,
  requirePermission("catalog.product.update"),
  validate(imageIdParamSchema, "params"),
  validate(updateProductImageSchema, "body"),
  controller.update,
);

/* ------------------------------------------------------------------
 * DELETE
 * ------------------------------------------------------------------ */

productImageDirectRouter.delete(
  "/:id",
  authenticate,
  requirePermission("catalog.product.update"),
  validate(imageIdParamSchema, "params"),
  controller.delete,
);