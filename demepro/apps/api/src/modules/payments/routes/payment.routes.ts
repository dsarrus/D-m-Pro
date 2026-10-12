// apps/api/src/modules/payment/routes/payment.routes.ts

import express, { Router } from "express";

import { PaymentController } from "../controllers/payment.controller";
import { PaymentWebhookController } from "../controllers/payment-webhook.controller";
import { PaymentService } from "../services/payment.service";
import { PaymentRepository } from "../repositories/payment.repository";

import { prisma } from "../../../infrastructure/database/prisma";

import { OrderService } from "../../orders/services/order.service";
import { OrderRepository } from "../../orders/repositories/order.repository";
import { InventoryService } from "../../catalog/services/inventory.service";
import { InventoryRepository } from "../../catalog/repositories/inventory.repository";

import {
  initiatePaymentSchema,
  refundPaymentSchema,
  orderIdParamSchema,
  providerNameParamSchema,
} from "../dtos/payment.dto";

import { validate } from "../../../shared/middleware/validate";
import { authenticate } from "../../../shared/middleware/authenticate";
import { requirePermission } from "../../../shared/middleware/require-permission";

/* ================================================================
 * WIRING
 * ================================================================ */

const inventoryRepo = new InventoryRepository(prisma);
const inventoryService = new InventoryService(prisma, inventoryRepo);

const orderRepo = new OrderRepository(prisma);
const orderService = new OrderService(prisma, orderRepo, inventoryService);

const paymentRepo = new PaymentRepository(prisma);
const service = new PaymentService(prisma, paymentRepo, orderService);

const controller = new PaymentController(service);
const webhookController = new PaymentWebhookController(service);

/* ================================================================
 * ROUTER AUTHENTIFIÉ — /api/v1/orders/:id/payment
 * ================================================================ */

export const paymentOrderRouter = Router({ mergeParams: true });

paymentOrderRouter.post(
  "/",
  authenticate,
  requirePermission("order.payment.initiate"),
  validate(orderIdParamSchema, "params"),
  validate(initiatePaymentSchema, "body"),
  controller.initiate,
);

paymentOrderRouter.get(
  "/",
  authenticate,
  validate(orderIdParamSchema, "params"),
  controller.getByOrder,
);

paymentOrderRouter.post(
  "/refund",
  authenticate,
  requirePermission("order.payment.refund"),
  validate(orderIdParamSchema, "params"),
  validate(refundPaymentSchema, "body"),
  controller.refund,
);

/* ================================================================
 * ROUTER PUBLIC — /api/v1/webhooks/payment/:provider
 * ================================================================ */

export const paymentWebhookRouter = Router();

paymentWebhookRouter.post(
  "/:provider",
  express.raw({ type: "application/json" }),
  validate(providerNameParamSchema, "params"),
  webhookController.handle,
);