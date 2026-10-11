// apps/api/src/modules/catalog/controllers/inventory.controller.ts

import type { Request, Response, NextFunction } from "express";

import { InventoryService } from "../services/inventory.service";
import { requireUser } from "../../../shared/utils/req-user";

import type {
  SetInventoryQuantityDto,
  AdjustInventoryQuantityDto,
  CreateInventoryBodyDto,
} from "../dto/inventory.dto";

export class InventoryController {
  constructor(private readonly service: InventoryService) {}

  /* ================================================================
   * GET — /catalog/inventory/:id
   * ================================================================ */

  getById = async (
    req: Request<{ id: string }>,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const user = requireUser(req);
      const inventory = await this.service.getById(req.params.id, user.id);

      return res.json({
        success: true,
        data: inventory,
      });
    } catch (error) {
      next(error);
    }
  };

  /* ================================================================
   * PATCH — /catalog/inventory/:id
   * ================================================================ */

  setQuantity = async (
    req: Request<{ id: string }, {}, SetInventoryQuantityDto>,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const user = requireUser(req);
      const inventory = await this.service.setQuantity(
        req.params.id,
        user.id,
        req.body.quantity,
      );

      return res.json({
        success: true,
        data: inventory,
      });
    } catch (error) {
      next(error);
    }
  };

  /* ================================================================
   * POST — /catalog/inventory/:id/adjust
   * ================================================================ */

  adjustQuantity = async (
    req: Request<{ id: string }, {}, AdjustInventoryQuantityDto>,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const user = requireUser(req);
      const inventory = await this.service.adjustQuantity(
        req.params.id,
        user.id,
        req.body.delta,
      );

      return res.json({
        success: true,
        data: inventory,
      });
    } catch (error) {
      next(error);
    }
  };

  /* ================================================================
   * POST — /catalog/inventory/product/:productId
   * ================================================================ */

  createForProduct = async (
    req: Request<{ productId: string }, {}, CreateInventoryBodyDto>,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const user = requireUser(req);
      const inventory = await this.service.createForProduct(
        req.params.productId,
        user.id,
        req.body.quantity,
      );

      return res.status(201).json({
        success: true,
        data: inventory,
      });
    } catch (error) {
      next(error);
    }
  };

  /* ================================================================
   * POST — /catalog/inventory/variant/:variantId
   * ================================================================ */

  createForVariant = async (
    req: Request<{ variantId: string }, {}, CreateInventoryBodyDto>,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const user = requireUser(req);
      const inventory = await this.service.createForVariant(
        req.params.variantId,
        user.id,
        req.body.quantity,
      );

      return res.status(201).json({
        success: true,
        data: inventory,
      });
    } catch (error) {
      next(error);
    }
  };
}