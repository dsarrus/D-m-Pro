// apps/api/src/modules/catalog/controllers/product-variant.controller.ts

import type { Request, Response, NextFunction } from "express";

import { ProductVariantService } from "../services/product-variant.service";

import type {
  CreateProductVariantDto,
  UpdateProductVariantDto,
} from "../dtos/productVariant.dto";

export class ProductVariantController {
  constructor(private readonly service: ProductVariantService) {}

  /* ================================================================
   * CREATE
   * ================================================================ */

  create = async (
    req: Request<{ productId: string }, {}, CreateProductVariantDto>,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const result = await this.service.createVariant(
        req.params.productId,
        req.body,
        { userId: req.user.id },
        req.header("Idempotency-Key") ?? undefined,
      );

      return res.status(201).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  /* ================================================================
   * GET
   * ================================================================ */

  getById = async (
    req: Request<{ id: string }>,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const variant = await this.service.getVariant(req.params.id);

      return res.json({
        success: true,
        data: variant,
      });
    } catch (error) {
      next(error);
    }
  };

  /* ================================================================
   * LIST BY PRODUCT
   * ================================================================ */

  listByProduct = async (
    req: Request<{ productId: string }>,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const variants = await this.service.listByProduct(req.params.productId, {
        userId: req.user.id,
      });

      return res.json({
        success: true,
        data: variants,
      });
    } catch (error) {
      next(error);
    }
  };

  /* ================================================================
   * UPDATE
   * ================================================================ */

  update = async (
    req: Request<{ id: string }, {}, UpdateProductVariantDto>,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const variant = await this.service.updateVariant(
        req.params.id,
        req.body,
        { userId: req.user.id },
      );

      return res.json({
        success: true,
        data: variant,
      });
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
      const result = await this.service.deleteVariant(req.params.id, {
        userId: req.user.id,
      });

      return res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  /* ================================================================
   * ACTIVATE / DEACTIVATE
   * ================================================================ */

  activate = async (
    req: Request<{ id: string }>,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const variant = await this.service.activateVariant(req.params.id, {
        userId: req.user.id,
      });

      return res.json({
        success: true,
        data: variant,
      });
    } catch (error) {
      next(error);
    }
  };

  deactivate = async (
    req: Request<{ id: string }>,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const variant = await this.service.deactivateVariant(req.params.id, {
        userId: req.user.id,
      });

      return res.json({
        success: true,
        data: variant,
      });
    } catch (error) {
      next(error);
    }
  };
}
