// apps/api/src/modules/review/controllers/review.controller.ts

import type { Request, Response, NextFunction } from "express";

import { ReviewService } from "../services/review.service";

import type {
  CreateReviewDto,
  UpdateReviewDto,
  ReportReviewDto,
  ModerateReviewDto,
  ResolveReportDto,
} from "../dtos/review.dto";

export class ReviewController {
  constructor(private readonly service: ReviewService) {}

  /* ================================================================
   * CREATE
   * ================================================================ */

  create = async (
    req: Request<{}, {}, CreateReviewDto>,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const review = await this.service.createReview(req.body, {
        userId: req.user!.id,
        role: req.user!.role,
      });

      return res.status(201).json({ success: true, data: review });
    } catch (error) {
      next(error);
    }
  };

  /* ================================================================
   * GET / LIST
   * ================================================================ */

  getById = async (
    req: Request<{ id: string }>,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const review = await this.service.getReview(req.params.id);
      return res.json({ success: true, data: review });
    } catch (error) {
      next(error);
    }
  };

  listByProduct = async (
    req: Request<{ productId: string }>,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const result = await this.service.listByProduct(
        req.params.productId,
        req.query as any,
      );
      return res.json({
        success: true,
        data: result.data,
        pagination: {
          hasMore: result.hasMore,
          nextCursor: result.nextCursor,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  listByStore = async (
    req: Request<{ storeId: string }>,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const result = await this.service.listByStore(
        req.params.storeId,
        req.query as any,
      );
      return res.json({
        success: true,
        data: result.data,
        pagination: {
          hasMore: result.hasMore,
          nextCursor: result.nextCursor,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  listByProfessional = async (
    req: Request<{ professionalId: string }>,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const result = await this.service.listByProfessional(
        req.params.professionalId,
        req.query as any,
      );
      return res.json({
        success: true,
        data: result.data,
        pagination: {
          hasMore: result.hasMore,
          nextCursor: result.nextCursor,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  getRatingSummary = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const { productId, storeId, professionalId } = req.query as any;

      const summary = await this.service.getRatingSummary({
        productId,
        storeId,
        professionalId,
      });

      return res.json({ success: true, data: summary });
    } catch (error) {
      next(error);
    }
  };

  /* ================================================================
   * UPDATE
   * ================================================================ */

  update = async (
    req: Request<{ id: string }, {}, UpdateReviewDto>,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const review = await this.service.updateReview(
        req.params.id,
        req.body,
        { userId: req.user!.id, role: req.user!.role },
      );

      return res.json({ success: true, data: review });
    } catch (error) {
      next(error);
    }
  };

  /* ================================================================
   * DELETE
   * ================================================================ */

  delete = async (
    req: Request<{ id: string }>,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const result = await this.service.deleteReview(req.params.id, {
        userId: req.user!.id,
        role: req.user!.role,
      });

      return res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  };

  /* ================================================================
   * REPORT
   * ================================================================ */

  report = async (
    req: Request<{ id: string }, {}, ReportReviewDto>,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const report = await this.service.reportReview(
        req.params.id,
        req.body,
        { userId: req.user!.id, role: req.user!.role },
      );

      return res.status(201).json({ success: true, data: report });
    } catch (error) {
      next(error);
    }
  };

  /* ================================================================
   * MODÉRATION (admin)
   * ================================================================ */

  moderate = async (
    req: Request<{ id: string }, {}, ModerateReviewDto>,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const review = await this.service.moderateReview(
        req.params.id,
        req.body,
        { userId: req.user!.id, role: req.user!.role },
      );

      return res.json({ success: true, data: review });
    } catch (error) {
      next(error);
    }
  };

  listPendingReports = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const reports = await this.service.listPendingReports({
        userId: req.user!.id,
        role: req.user!.role,
      });

      return res.json({ success: true, data: reports });
    } catch (error) {
      next(error);
    }
  };

  resolveReport = async (
    req: Request<{ reportId: string }, {}, ResolveReportDto>,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const report = await this.service.resolveReport(
        req.params.reportId,
        req.body,
        { userId: req.user!.id, role: req.user!.role },
      );

      return res.json({ success: true, data: report });
    } catch (error) {
      next(error);
    }
  };
}