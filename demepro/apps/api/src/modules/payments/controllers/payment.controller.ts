// apps/api/src/modules/payment/controllers/payment.controller.ts

import type { Request, Response, NextFunction } from "express";

import { PaymentService } from "../services/payment.service";

import type {
  InitiatePaymentDto,
  RefundPaymentDto,
} from "../dtos/payment.dto";

export class PaymentController {
  constructor(private readonly service: PaymentService) {}

  /* ================================================================
   * INITIATE
   * ================================================================ */

  initiate = async (
    req: Request<{ id: string }, {}, InitiatePaymentDto>,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const result = await this.service.initiatePayment(
        req.params.id,
        req.body,
        { userId: req.user!.id, role: req.user!.role },
      );

      return res.status(201).json({
        success: true,
        data: {
          payment: result.payment,
          redirectUrl: result.redirectUrl,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  /* ================================================================
   * GET
   * ================================================================ */

  getByOrder = async (
    req: Request<{ id: string }>,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const payment = await this.service.getPaymentByOrder(
        req.params.id,
        { userId: req.user!.id, role: req.user!.role },
      );

      return res.json({ success: true, data: payment });
    } catch (error) {
      next(error);
    }
  };

  /* ================================================================
   * REFUND
   * ================================================================ */

  refund = async (
    req: Request<{ id: string }, {}, RefundPaymentDto>,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const result = await this.service.refundPayment(
        req.params.id,
        req.body,
        { userId: req.user!.id, role: req.user!.role },
      );

      return res.json({
        success: true,
        data: {
          payment: result.payment,
          refundRef: result.refundRef,
        },
      });
    } catch (error) {
      next(error);
    }
  };
}