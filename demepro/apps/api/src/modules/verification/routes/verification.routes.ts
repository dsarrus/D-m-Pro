// apps/api/src/modules/verification/routes/verification.routes.ts

import { Router } from "express";

import { VerificationController } from "../controllers/verification.controller";
import { VerificationService } from "../services/verification.service";

import { prisma } from "../../../infrastructure/database/prisma";

import {
  upgradeToTrustedSchema,
  requestCertificationSchema,
  rejectCertificationSchema,
  verificationIdParamSchema,
} from "../dtos/verification.dto";

import { validate } from "../../../shared/middleware/validate";
import { authenticate } from "../../../shared/middleware/authenticate";
import { requirePermission } from "../../../shared/middleware/require-permission";

/* ================================================================
 * WIRING
 * ================================================================ */

const service = new VerificationService(prisma);
const controller = new VerificationController(service);

/* ================================================================
 * ROUTES
 * ================================================================ */

const router = Router();

/* ------------------------------------------------------------------
 * UTILISATEUR — Son propre statut
 * ------------------------------------------------------------------ */

router.get(
  "/me/verification",
  authenticate,
  controller.getMyStatus,
);

/* ------------------------------------------------------------------
 * PHASE 2 — Upgrade TRUSTED
 * ------------------------------------------------------------------ */

router.post(
  "/me/verification/upgrade-trusted",
  authenticate,
  validate(upgradeToTrustedSchema, "body"),
  controller.upgradeToTrusted,
);

/* ------------------------------------------------------------------
 * PHASE 3 — Demande CERTIFIED
 * ------------------------------------------------------------------ */

router.post(
  "/me/verification/request-certification",
  authenticate,
  validate(requestCertificationSchema, "body"),
  controller.requestCertification,
);

/* ------------------------------------------------------------------
 * ADMIN — Validation / Rejet
 * ------------------------------------------------------------------ */

router.post(
  "/admin/verification/:verificationId/approve",
  authenticate,
  requirePermission("admin.verification.approve"),
  validate(verificationIdParamSchema, "params"),
  controller.approveCertification,
);

router.post(
  "/admin/verification/:verificationId/reject",
  authenticate,
  requirePermission("admin.verification.reject"),
  validate(verificationIdParamSchema, "params"),
  validate(rejectCertificationSchema, "body"),
  controller.rejectCertification,
);

export default router;