// apps/api/src/modules/payments/controllers/payment-webhook.controller.ts

import type { Request, Response, NextFunction } from "express";

import { PaymentService } from "../services/payment.service";

export class PaymentWebhookController {
  constructor(private readonly service: PaymentService) {}

  handle = async (
    req: Request<{ provider: string }>,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const providerName = req.params.provider;

      /* ⭐ Gestion correcte du body :
       *  - Buffer (express.raw) → utiliser toString()
       *  - string (body-parser) → utiliser directement
       *  - object (fallback) → JSON.stringify
       */
      let rawBody: string;

      if (Buffer.isBuffer(req.body)) {
        rawBody = req.body.toString("utf8");
      } else if (typeof req.body === "string") {
        rawBody = req.body;
      } else {
        rawBody = JSON.stringify(req.body);
      }

      const signature =
        req.header("X-Webhook-Signature") ??
        req.header("X-Signature") ??
        undefined;

      const result = await this.service.handleWebhook(
        providerName,
        rawBody,
        signature,
      );

      return res.json({
        success: true,
        data: {
          paymentId: result.payment.id,
          status: result.payment.status,
          idempotent: result.idempotent,
        },
      });
    } catch (error) {
      next(error);
    }
  };
}