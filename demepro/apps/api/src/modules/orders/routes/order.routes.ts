// apps/api/src/modules/order/routes/order.routes.ts

import { Router } from "express";

import { OrderController } from "../controllers/order.controller";
import { OrderService } from "../services/order.service";
import { OrderRepository } from "../repositories/order.repository";

import { prisma } from "../../../infrastructure/database/prisma";

import { InventoryService } from "../../catalog/services/inventory.service";
import { InventoryRepository } from "../../catalog/repositories/inventory.repository";

import {
  createOrderSchema,
  shipOrderSchema,
  cancelOrderSchema,
  deliverOrderSchema,
  orderIdParamSchema,
} from "../dtos/order.dto";

import { validate } from "../../../shared/middleware/validate";
import { authenticate } from "../../../shared/middleware/authenticate";
import { requirePermission } from "../../../shared/middleware/require-permission";

/* ================================================================
 * WIRING
 * ================================================================ */

const inventoryRepo = new InventoryRepository(prisma);
const inventoryService = new InventoryService(prisma, inventoryRepo);

const repository = new OrderRepository(prisma);
const service = new OrderService(prisma, repository, inventoryService);
const controller = new OrderController(service);

/* ================================================================
 * ROUTES
 * ================================================================ */

const router = Router();

/* ------------------------------------------------------------------
 * CREATE
 * ------------------------------------------------------------------ */

router.post(
  "/",
  authenticate,
  requirePermission("order.create"),
  validate(createOrderSchema, "body"),
  controller.create,
);

/* ------------------------------------------------------------------
 * LIST — mes commandes (client)
 * ------------------------------------------------------------------ */

router.get(
  "/mine",
  authenticate,
  requirePermission("order.read.own"),
  controller.listMine,
);

/* ------------------------------------------------------------------
 * LIST — commandes reçues par une boutique (pro)
 * ------------------------------------------------------------------ */

router.get(
  "/store/:storeId",
  authenticate,
  requirePermission("order.read.store"),
  controller.listStoreOrders,
);

/* ------------------------------------------------------------------
 * GET — détail d'une commande
 * ------------------------------------------------------------------ */

router.get(
  "/:id",
  authenticate,
  validate(orderIdParamSchema, "params"),
  controller.getById,
);

/* ------------------------------------------------------------------
 * ACTIONS
 * ------------------------------------------------------------------ */

router.post(
  "/:id/ship",
  authenticate,
  requirePermission("order.ship.store"),
  validate(orderIdParamSchema, "params"),
  validate(shipOrderSchema, "body"),
  controller.ship,
);

router.post(
  "/:id/deliver",
  authenticate,
  requirePermission("order.deliver.store"),
  validate(orderIdParamSchema, "params"),
  validate(deliverOrderSchema, "body"),
  controller.deliver,
);

router.post(
  "/:id/cancel",
  authenticate,
  validate(orderIdParamSchema, "params"),
  validate(cancelOrderSchema, "body"),
  controller.cancel,
);

export default router;