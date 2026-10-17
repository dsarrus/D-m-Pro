// apps/api/src/modules/quotes/routes/quote.routes.ts

import { Router } from "express";

import { QuoteController } from "../controllers/quote.controller";
import { QuoteService } from "../services/quote.service";
import { QuoteRepository } from "../repositories/quote.repository";

import { NotificationService } from "../../notifications/services/notification.service";
import { NotificationRepository } from "../../notifications/repositories/notification.repository";
import { NotificationTemplateService } from "../../notifications/services/notification-template.service";

import { prisma } from "../../../infrastructure/database/prisma";

import {
  createQuoteSchema,
  respondToQuoteSchema,
  acceptQuoteSchema,
  rejectQuoteSchema,
  quoteIdParamSchema,
  serviceIdParamSchema,
  listQuotesQuerySchema,
} from "../dtos/quote.dto";

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

const repository = new QuoteRepository(prisma);
const service = new QuoteService(prisma, repository, notificationService);
const controller = new QuoteController(service);

/* ================================================================
 * ROUTES
 * ================================================================ */

const router = Router();

/* ------------------------------------------------------------------
 * AUTHENTIFIÉ — CRÉATION (CLIENT)
 * ------------------------------------------------------------------ */

router.post(
  "/",
  authenticate,
  requirePermission("quote.create"),
  validate(createQuoteSchema, "body"),
  controller.create,
);

/* ------------------------------------------------------------------
 * AUTHENTIFIÉ — LECTURES
 * ------------------------------------------------------------------ */

router.get(
  "/mine",
  authenticate,
  requirePermission("quote.read.own"),
  validate(listQuotesQuerySchema, "query"),
  controller.listMine,
);

router.get(
  "/professional",
  authenticate,
  requirePermission("quote.read.received"),
  validate(listQuotesQuerySchema, "query"),
  controller.listProfessional,
);

router.get(
  "/service/:serviceId",
  authenticate,
  requirePermission("quote.read.received"),
  validate(serviceIdParamSchema, "params"),
  validate(listQuotesQuerySchema, "query"),
  controller.listByService,
);

router.get(
  "/:id",
  authenticate,
  requirePermission("quote.read.own"),
  validate(quoteIdParamSchema, "params"),
  controller.getById,
);

/* ------------------------------------------------------------------
 * AUTHENTIFIÉ — ACTIONS
 * ------------------------------------------------------------------ */

router.post(
  "/:id/respond",
  authenticate,
  requirePermission("quote.respond"),
  validate(quoteIdParamSchema, "params"),
  validate(respondToQuoteSchema, "body"),
  controller.respond,
);

router.post(
  "/:id/accept",
  authenticate,
  requirePermission("quote.accept"),
  validate(quoteIdParamSchema, "params"),
  validate(acceptQuoteSchema, "body"),
  controller.accept,
);

router.post(
  "/:id/reject",
  authenticate,
  requirePermission("quote.reject"),
  validate(quoteIdParamSchema, "params"),
  validate(rejectQuoteSchema, "body"),
  controller.reject,
);

export default router;