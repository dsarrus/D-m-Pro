// apps/api/src/modules/verification/controllers/verification.controller.ts

import type { Request, Response, NextFunction } from "express";

import { VerificationService } from "../services/verification.service";

import type {
  UpgradeToTrustedDto,
  RequestCertificationDto,
  RejectCertificationDto,
} from "../dtos/verification.dto";

export class VerificationController {
  constructor(private readonly service: VerificationService) {}

  /* ================================================================
   * GET
   * ================================================================ */

  getMyStatus = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const status = await this.service.getMyVerificationStatus({
        userId: req.user!.id,
      });

      return res.json({ success: true, data: status });
    } catch (error) {
      next(error);
    }
  };

  /* ================================================================
   * PHASE 2 — Upgrade TRUSTED
   * ================================================================ */

  upgradeToTrusted = async (
    req: Request<{}, {}, UpgradeToTrustedDto>,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const result = await this.service.upgradeToTrusted(
        req.body.selfieKey,
        { userId: req.user!.id },
      );

      return res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  };

  /* ================================================================
   * PHASE 3 — Demande CERTIFIED
   * ================================================================ */

  requestCertification = async (
    req: Request<{}, {}, RequestCertificationDto>,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const result = await this.service.requestCertification(
        req.body.kycDocumentKey,
        { userId: req.user!.id },
      );

      return res.status(201).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  };

  /* ================================================================
   * ADMIN — Validation / Rejet
   * ================================================================ */

  approveCertification = async (
    req: Request<{ verificationId: string }>,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const result = await this.service.approveCertification(
        req.params.verificationId,
        {
          userId: req.user!.id,
          role: req.user!.role,
        },
      );

      return res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  };

  rejectCertification = async (
    req: Request<
      { verificationId: string },
      {},
      RejectCertificationDto
    >,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const result = await this.service.rejectCertification(
        req.params.verificationId,
        req.body.reason,
        {
          userId: req.user!.id,
          role: req.user!.role,
        },
      );

      return res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  };
}