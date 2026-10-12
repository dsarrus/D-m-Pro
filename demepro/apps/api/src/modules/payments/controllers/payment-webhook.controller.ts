// apps/api/src/modules/payment/controllers/payment-webhook.controller.ts

import type { Request, Response, NextFunction } from "express";

import { PaymentService } from "../services/payment.service";

export class PaymentWebhookController {
  constructor(private readonly service: PaymentService) {}

  /**
   * Reçoit un webhook de paiement.
   *
   * Le body est reçu en brut (raw) pour vérifier la signature HMAC.
   * Utilise `express.raw({ type: 'application/json' })` sur cette route.
   */
  handle = async (
    req: Request<{ provider: string }>,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const providerName = req.params.provider;
      const rawBody =
        typeof req.body === "string"
          ? req.body
          : JSON.stringify(req.body);

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