// apps/api/src/modules/address/routes/address.routes.ts

import { Router } from "express";

import { AddressController } from "../controllers/address.controller";
import { AddressService } from "../services/address.service";
import { AddressRepository } from "../repositories/address.repository";

import { prisma } from "../../../infrastructure/database/prisma";

import {
  createAddressSchema,
  updateAddressSchema,
  addressIdParamSchema,
} from "../dtos/address.dto";

import { validate } from "../../../shared/middleware/validate";
import { authenticate } from "../../../shared/middleware/authenticate";
import { requirePermission } from "../../../shared/middleware/require-permission";

/* ================================================================
 * WIRING
 * ================================================================ */

const repository = new AddressRepository(prisma);
const service = new AddressService(prisma, repository);
const controller = new AddressController(service);

/* ================================================================
 * ROUTES
 * ================================================================ */

const router = Router();

/* Toutes les routes nécessitent l'authentification */

router.use(authenticate);

/* ------------------------------------------------------------------
 * CREATE
 * ------------------------------------------------------------------ */

router.post(
  "/",
  requirePermission("address.create"),
  validate(createAddressSchema, "body"),
  controller.create,
);

/* ------------------------------------------------------------------
 * LIST — mes adresses
 * ------------------------------------------------------------------ */

router.get(
  "/mine",
  requirePermission("address.read.own"),
  controller.listMine,
);

/* ------------------------------------------------------------------
 * GET — adresse par défaut
 * ------------------------------------------------------------------ */

router.get(
  "/default",
  requirePermission("address.read.own"),
  controller.getDefault,
);

/* ------------------------------------------------------------------
 * GET — détail
 * ------------------------------------------------------------------ */

router.get(
  "/:id",
  requirePermission("address.read.own"),
  validate(addressIdParamSchema, "params"),
  controller.getById,
);

/* ------------------------------------------------------------------
 * UPDATE
 * ------------------------------------------------------------------ */

router.patch(
  "/:id",
  requirePermission("address.update.own"),
  validate(addressIdParamSchema, "params"),
  validate(updateAddressSchema, "body"),
  controller.update,
);

/* ------------------------------------------------------------------
 * SET DEFAULT
 * ------------------------------------------------------------------ */

router.post(
  "/:id/default",
  requirePermission("address.update.own"),
  validate(addressIdParamSchema, "params"),
  controller.setDefault,
);

/* ------------------------------------------------------------------
 * DELETE
 * ------------------------------------------------------------------ */

router.delete(
  "/:id",
  requirePermission("address.delete.own"),
  validate(addressIdParamSchema, "params"),
  controller.delete,
);

export default router;