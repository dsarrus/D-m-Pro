// apps/api/src/modules/catalog/routes/inventory.routes.ts

import { Router } from "express";

import { InventoryController } from "../controllers/inventory.controller";
import { InventoryService } from "../services/inventory.service";
import { InventoryRepository } from "../repositories/inventory.repository";

import { prisma } from "../../../infrastructure/database/prisma";

import {
  setInventoryQuantitySchema,
  adjustInventoryQuantitySchema,
  createInventoryBodySchema,
  inventoryIdParamSchema,
  inventoryProductParamSchema,
  inventoryVariantParamSchema,
} from "../dto/inventory.dto";

import { validate } from "../../../shared/middleware/validate";
import { authenticate } from "../../../shared/middleware/authenticate";
import { requirePermission } from "../../../shared/middleware/require-permission";

/* ================================================================
 * WIRING
 * ================================================================ */

const repository = new InventoryRepository(prisma);
const service = new InventoryService(prisma, repository);
const controller = new InventoryController(service);

/* ================================================================
 * ROUTES
 * ================================================================ */

const router = Router();

/* ------------------------------------------------------------------
 * POST — Créer un inventaire pour un produit simple
 * ------------------------------------------------------------------ */

router.post(
  "/product/:productId",
  authenticate,
  requirePermission("catalog.product.update"),
  validate(inventoryProductParamSchema, "params"),
  validate(createInventoryBodySchema, "body"),
  controller.createForProduct,
);

/* ------------------------------------------------------------------
 * POST — Créer un inventaire pour une variante
 * ------------------------------------------------------------------ */

router.post(
  "/variant/:variantId",
  authenticate,
  requirePermission("catalog.product.update"),
  validate(inventoryVariantParamSchema, "params"),
  validate(createInventoryBodySchema, "body"),
  controller.createForVariant,
);

/* ------------------------------------------------------------------
 * GET — Consulter un inventaire
 * ------------------------------------------------------------------ */

router.get(
  "/:id",
  authenticate,
  requirePermission("catalog.product.read"),
  validate(inventoryIdParamSchema, "params"),
  controller.getById,
);

/* ------------------------------------------------------------------
 * PATCH — Définir la quantité absolue
 * ------------------------------------------------------------------ */

router.patch(
  "/:id",
  authenticate,
  requirePermission("catalog.product.update"),
  validate(inventoryIdParamSchema, "params"),
  validate(setInventoryQuantitySchema, "body"),
  controller.setQuantity,
);

/* ------------------------------------------------------------------
 * POST — Ajustement relatif
 * ------------------------------------------------------------------ */

router.post(
  "/:id/adjust",
  authenticate,
  requirePermission("catalog.product.update"),
  validate(inventoryIdParamSchema, "params"),
  validate(adjustInventoryQuantitySchema, "body"),
  controller.adjustQuantity,
);

export default router;