// apps/api/src/modules/review/routes/review.routes.ts

import { Router } from "express";

import { ReviewController } from "../controllers/review.controller";
import { ReviewService } from "../services/review.service";
import { ReviewRepository } from "../repositories/review.repository";

import { NotificationService } from "../../notifications/services/notification.service";
import { NotificationRepository } from "../../notifications/repositories/notification.repository";
import { NotificationTemplateService } from "../../notifications/services/notification-template.service";

import { prisma } from "../../../infrastructure/database/prisma";

import {
  createReviewSchema,
  updateReviewSchema,
  reportReviewSchema,
  moderateReviewSchema,
  resolveReportSchema,
  reviewIdParamSchema,
  reportIdParamSchema,
  listReviewsQuerySchema,
} from "../dtos/review.dto";

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

const repository = new ReviewRepository(prisma);
const service = new ReviewService(prisma, repository, notificationService);
const controller = new ReviewController(service);

/* ================================================================
 * ROUTES
 * ================================================================ */

const router = Router();

/* ------------------------------------------------------------------
 * PUBLIC — Lecture
 * ------------------------------------------------------------------ */

router.get(
  "/products/:productId",
  validate(listReviewsQuerySchema, "query"),
  controller.listByProduct,
);

router.get(
  "/stores/:storeId",
  validate(listReviewsQuerySchema, "query"),
  controller.listByStore,
);

router.get(
  "/professionals/:professionalId",
  validate(listReviewsQuerySchema, "query"),
  controller.listByProfessional,
);

router.get(
  "/summary",
  controller.getRatingSummary,
);

/* ------------------------------------------------------------------
 * AUTHENTIFIÉ — Écriture
 * ------------------------------------------------------------------ */

router.post(
  "/",
  authenticate,
  requirePermission("review.create"),
  validate(createReviewSchema, "body"),
  controller.create,
);

router.get(
  "/:id",
  validate(reviewIdParamSchema, "params"),
  controller.getById,
);

router.patch(
  "/:id",
  authenticate,
  requirePermission("review.update.own"),
  validate(reviewIdParamSchema, "params"),
  validate(updateReviewSchema, "body"),
  controller.update,
);

router.delete(
  "/:id",
  authenticate,
  requirePermission("review.delete.own"),
  validate(reviewIdParamSchema, "params"),
  controller.delete,
);

router.post(
  "/:id/report",
  authenticate,
  requirePermission("review.report"),
  validate(reviewIdParamSchema, "params"),
  validate(reportReviewSchema, "body"),
  controller.report,
);

/* ------------------------------------------------------------------
 * ADMIN — Modération
 * ------------------------------------------------------------------ */

router.post(
  "/:id/moderate",
  authenticate,
  requirePermission("review.moderate"),
  validate(reviewIdParamSchema, "params"),
  validate(moderateReviewSchema, "body"),
  controller.moderate,
);

router.get(
  "/admin/reports",
  authenticate,
  requirePermission("review.moderate"),
  controller.listPendingReports,
);

router.post(
  "/admin/reports/:reportId/resolve",
  authenticate,
  requirePermission("review.moderate"),
  validate(reportIdParamSchema, "params"),
  validate(resolveReportSchema, "body"),
  controller.resolveReport,
);

export default router;