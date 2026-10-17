// apps/api/src/modules/bookings/routes/booking.routes.ts

import { Router } from "express";

import { BookingController } from "../controllers/booking.controller";
import { BookingService } from "../services/booking.service";
import { BookingRepository } from "../repositories/booking.repository";

import { NotificationService } from "../../notifications/services/notification.service";
import { NotificationRepository } from "../../notifications/repositories/notification.repository";
import { NotificationTemplateService } from "../../notifications/services/notification-template.service";

import { prisma } from "../../../infrastructure/database/prisma";

import {
  createBookingSchema,
  startBookingSchema,
  completeBookingSchema,
  cancelBookingSchema,
  noShowBookingSchema,
  bookingIdParamSchema,
  serviceIdParamSchema,
  listBookingsQuerySchema,
} from "../dtos/booking.dto";

import { validate } from "../../../shared/middleware/validate";
import { authenticate } from "../../../shared/middleware/authenticate";
import { requirePermission } from "../../../shared/middleware/require-permission";

/* ================================================================
 * WIRING
 * ================================================================ */
const notificationRepo = new NotificationRepository(prisma);
const notificationTemplates = new NotificationTemplateService();
const notificationService = new NotificationService(
  prisma,
  notificationRepo,
  notificationTemplates,
);

const repository = new BookingRepository(prisma);
const service = new BookingService(prisma, repository, notificationService);
const controller = new BookingController(service);

/* ================================================================
 * ROUTES
 * ================================================================ */

const router = Router();

/* ------------------------------------------------------------------
 * CREATE (client)
 * ------------------------------------------------------------------ */

router.post(
  "/",
  authenticate,
  requirePermission("booking.create"),
  validate(createBookingSchema, "body"),
  controller.create,
);

/* ------------------------------------------------------------------
 * LECTURES
 * ------------------------------------------------------------------ */

router.get(
  "/mine",
  authenticate,
  requirePermission("booking.read.own"),
  validate(listBookingsQuerySchema, "query"),
  controller.listMine,
);

router.get(
  "/professional",
  authenticate,
  requirePermission("booking.read.received"),
  validate(listBookingsQuerySchema, "query"),
  controller.listProfessional,
);

router.get(
  "/service/:serviceId",
  authenticate,
  requirePermission("booking.read.received"),
  validate(serviceIdParamSchema, "params"),
  validate(listBookingsQuerySchema, "query"),
  controller.listByService,
);

router.get(
  "/:id",
  authenticate,
  requirePermission("booking.read.own"),
  validate(bookingIdParamSchema, "params"),
  controller.getById,
);

/* ------------------------------------------------------------------
 * ACTIONS
 * ------------------------------------------------------------------ */

router.post(
  "/:id/start",
  authenticate,
  requirePermission("booking.start"),
  validate(bookingIdParamSchema, "params"),
  validate(startBookingSchema, "body"),
  controller.start,
);

router.post(
  "/:id/complete",
  authenticate,
  requirePermission("booking.complete"),
  validate(bookingIdParamSchema, "params"),
  validate(completeBookingSchema, "body"),
  controller.complete,
);

router.post(
  "/:id/cancel",
  authenticate,
  requirePermission("booking.cancel"),
  validate(bookingIdParamSchema, "params"),
  validate(cancelBookingSchema, "body"),
  controller.cancel,
);

router.post(
  "/:id/no-show",
  authenticate,
  requirePermission("booking.no-show"),
  validate(bookingIdParamSchema, "params"),
  validate(noShowBookingSchema, "body"),
  controller.noShow,
);

export default router;