// apps/api/src/modules/notifications/routes/notification.routes.ts

import { Router } from "express";

import { NotificationController } from "../controllers/notification.controller";
import { NotificationService } from "../services/notification.service";
import { NotificationTemplateService } from "../services/notification-template.service";
import { NotificationRepository } from "../repositories/notification.repository";

import { prisma } from "../../../infrastructure/database/prisma";

import {
  notificationIdParamSchema,
  listNotificationsQuerySchema,
} from "../dtos/notification.dto";

import { validate } from "../../../shared/middleware/validate";
import { authenticate } from "../../../shared/middleware/authenticate";
import { requirePermission } from "../../../shared/middleware/require-permission";

/* ================================================================
 * WIRING
 * ================================================================ */

const repository = new NotificationRepository(prisma);
const templates = new NotificationTemplateService();
const service = new NotificationService(prisma, repository, templates);
const controller = new NotificationController(service);

/* ================================================================
 * ROUTES
 * ================================================================ */

const router = Router();

router.use(authenticate);

/* ------------------------------------------------------------------
 * LIST
 * ------------------------------------------------------------------ */

router.get(
  "/mine",
  requirePermission("notification.read.own"),
  validate(listNotificationsQuerySchema, "query"),
  controller.listMine,
);

/* ------------------------------------------------------------------
 * UNREAD COUNT
 * ------------------------------------------------------------------ */

router.get(
  "/unread-count",
  requirePermission("notification.read.own"),
  controller.unreadCount,
);

/* ------------------------------------------------------------------
 * MARK AS READ
 * ------------------------------------------------------------------ */

router.post(
  "/:id/read",
  requirePermission("notification.read.own"),
  validate(notificationIdParamSchema, "params"),
  controller.markAsRead,
);

router.post(
  "/read-all",
  requirePermission("notification.read.own"),
  controller.markAllAsRead,
);

export default router;