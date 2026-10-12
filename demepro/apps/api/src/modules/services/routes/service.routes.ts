// apps/api/src/modules/services/routes/service.routes.ts

import { Router } from "express";

import { ServiceController } from "../controllers/service.controller";
import { ServiceService } from "../services/service.service";
import { ServiceRepository } from "../repositories/service.repository";
import { ServiceImageRepository } from "../repositories/service-image.repository";
import { ServiceZoneRepository } from "../repositories/service-zone.repository";
import { AvailabilityRepository } from "../repositories/availability.repository";

import { prisma } from "../../../infrastructure/database/prisma";

import {
  createServiceSchema,
  createServiceFullSchema,
  updateServiceSchema,
  serviceImageSchema,
  serviceZoneSchema,
  availabilitySchema,
  reorderImagesSchema,
  serviceIdParamSchema,
  imageIdParamSchema,
  zoneIdParamSchema,
  availabilityIdParamSchema,
  listServicesQuerySchema,
} from "../dtos/service.dto";

import { validate } from "../../../shared/middleware/validate";
import { authenticate } from "../../../shared/middleware/authenticate";
import { requirePermission } from "../../../shared/middleware/require-permission";

/* ================================================================
 * WIRING
 * ================================================================ */

const repository = new ServiceRepository(prisma);
const imageRepository = new ServiceImageRepository(prisma);
const zoneRepository = new ServiceZoneRepository(prisma);
const availabilityRepository = new AvailabilityRepository(prisma);

const service = new ServiceService(
  prisma,
  repository,
  imageRepository,
  zoneRepository,
  availabilityRepository,
);

const controller = new ServiceController(service);

/* ================================================================
 * ROUTES
 * ================================================================ */

const router = Router();



/* ------------------------------------------------------------------
 * AUTHENTIFIÉ — Professional
 * ------------------------------------------------------------------ */

router.post(
  "/",
  authenticate,
  requirePermission("service.create"),
  validate(createServiceSchema, "body"),
  controller.create,
);

router.post(
  "/full",
  authenticate,
  requirePermission("service.create"),
  validate(createServiceFullSchema, "body"),
  controller.createFull,
);

router.get(
  "/mine",
  authenticate,
  requirePermission("service.read.own"),
  controller.listMine,
);

/* ------------------------------------------------------------------
 * PUBLIC — Lecture
 * ------------------------------------------------------------------ */

router.get("/", validate(listServicesQuerySchema, "query"), controller.list);

router.get(
  "/:id",
  validate(serviceIdParamSchema, "params"),
  controller.getById,
);

router.patch(
  "/:id",
  authenticate,
  requirePermission("service.update.own"),
  validate(serviceIdParamSchema, "params"),
  validate(updateServiceSchema, "body"),
  controller.update,
);

router.post(
  "/:id/activate",
  authenticate,
  requirePermission("service.activate"),
  validate(serviceIdParamSchema, "params"),
  controller.activate,
);

router.delete(
  "/:id",
  authenticate,
  requirePermission("service.archive.own"),
  validate(serviceIdParamSchema, "params"),
  controller.archive,
);

/* ------------------------------------------------------------------
 * IMAGES
 * ------------------------------------------------------------------ */

router.post(
  "/:id/images",
  authenticate,
  requirePermission("service.update.own"),
  validate(serviceIdParamSchema, "params"),
  validate(serviceImageSchema, "body"),
  controller.addImage,
);

router.post(
  "/:id/images/reorder",
  authenticate,
  requirePermission("service.update.own"),
  validate(serviceIdParamSchema, "params"),
  validate(reorderImagesSchema, "body"),
  controller.reorderImages,
);

router.delete(
  "/images/:imageId",
  authenticate,
  requirePermission("service.update.own"),
  validate(imageIdParamSchema, "params"),
  controller.deleteImage,
);

/* ------------------------------------------------------------------
 * ZONES
 * ------------------------------------------------------------------ */

router.post(
  "/:id/zones",
  authenticate,
  requirePermission("service.update.own"),
  validate(serviceIdParamSchema, "params"),
  validate(serviceZoneSchema, "body"),
  controller.addZone,
);

router.delete(
  "/zones/:zoneId",
  authenticate,
  requirePermission("service.update.own"),
  validate(zoneIdParamSchema, "params"),
  controller.deleteZone,
);

/* ------------------------------------------------------------------
 * AVAILABILITIES
 * ------------------------------------------------------------------ */

router.post(
  "/:id/availabilities",
  authenticate,
  requirePermission("service.update.own"),
  validate(serviceIdParamSchema, "params"),
  validate(availabilitySchema, "body"),
  controller.addAvailability,
);

router.delete(
  "/availabilities/:availabilityId",
  authenticate,
  requirePermission("service.update.own"),
  validate(availabilityIdParamSchema, "params"),
  controller.deleteAvailability,
);

export default router;