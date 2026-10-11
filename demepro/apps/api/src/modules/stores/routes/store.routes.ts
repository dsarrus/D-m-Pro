// apps/api/src/modules/stores/routes/store.routes.ts

import { Router } from "express";

import { StoreController } from "../controllers/store.controller";
import { StoreService } from "../services/store.service";
import { StoreRepository } from "../repositories/store.repository";

import { prisma } from "../../../infrastructure/database/prisma";

import {
  createStoreSchema,
  updateStoreSchema,
  storeIdParamSchema,
  storeSlugParamSchema,
} from "../dtos/store.dto";

import { validate } from "../../../shared/middleware/validate";
import { authenticate } from "../../../shared/middleware/authenticate";
import { requirePermission } from "../../../shared/middleware/require-permission";

/* ================================================================
 * WIRING
 * ================================================================ */

const repository = new StoreRepository(prisma);
const service = new StoreService(prisma, repository);
const controller = new StoreController(service);

/* ================================================================
 * ROUTES
 * ================================================================ */

const router = Router();

/* ------------------------------------------------------------------
 * PUBLIC
 * ------------------------------------------------------------------ */

/* Liste publique des boutiques ACTIVE */
router.get("/", controller.listActive);

/* Détail public par slug (uniquement si ACTIVE) */
router.get(
  "/slug/:slug",
  validate(storeSlugParamSchema, "params"),
  controller.getBySlug,
);

/* ------------------------------------------------------------------
 * AUTHENTIFIÉ — Professional
 * ------------------------------------------------------------------ */

/* Créer ma boutique */
router.post(
  "/",
  authenticate,
  requirePermission("store.create"),
  validate(createStoreSchema, "body"),
  controller.create,
);

/* Voir ma boutique */
router.get(
  "/me",
  authenticate,
  requirePermission("store.read.own"),
  controller.getMyStore,
);

/* Détail par ID */
router.get(
  "/:id",
  authenticate,
  validate(storeIdParamSchema, "params"),
  controller.getById,
);

/* Modifier ma boutique */
router.patch(
  "/:id",
  authenticate,
  requirePermission("store.update.own"),
  validate(storeIdParamSchema, "params"),
  validate(updateStoreSchema, "body"),
  controller.update,
);

/* Activer ma boutique */
router.post(
  "/:id/activate",
  authenticate,
  requirePermission("store.activate"),
  validate(storeIdParamSchema, "params"),
  controller.activate,
);

/* Fermer ma boutique */
router.post(
  "/:id/close",
  authenticate,
  requirePermission("store.close"),
  validate(storeIdParamSchema, "params"),
  controller.close,
);

/* ------------------------------------------------------------------
 * ADMIN
 * ------------------------------------------------------------------ */

/* Suspendre une boutique */
router.post(
  "/:id/suspend",
  authenticate,
  requirePermission("store.suspend"),
  validate(storeIdParamSchema, "params"),
  controller.suspend,
);

export default router;