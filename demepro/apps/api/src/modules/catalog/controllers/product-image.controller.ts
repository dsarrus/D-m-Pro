// apps/api/src/modules/catalog/controllers/product-image.controller.ts

import type { Request, Response, NextFunction } from "express";
import { z } from "zod";

import { ProductImageService } from "../services/product-image.service";
import { requireUser } from "../../../shared/utils/req-user";
import type {
  CreateProductImageDto,
  UpdateProductImageDto,
} from "../dto/product-image.dto";

/* Reorder body : liste ordonnée d'IDs */
const reorderBodySchema = z.object({
  imageIds: z.array(z.string().uuid()).min(1),
});

type ReorderBody = z.infer<typeof reorderBodySchema>;

export class ProductImageController {
  constructor(private readonly service: ProductImageService) {}

  /* ================================================================
   * CREATE — POST /catalog/products/:productId/images
   * ================================================================ */

  create = async (
    req: Request<{ productId: string }, {}, CreateProductImageDto>,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const user = requireUser(req);
      const image = await this.service.createImage(
        req.params.productId,
        req.body,
        { userId: user.id },
      );

      return res.status(201).json({
        success: true,
        data: image,
      });
    } catch (error) {
      next(error);
    }
  };

  /* ================================================================
   * GET — /catalog/images/:id
   * ================================================================ */

  getById = async (
    req: Request<{ id: string }>,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const image = await this.service.getImage(req.params.id);

      return res.json({
        success: true,
        data: image,
      });
    } catch (error) {
      next(error);
    }
  };

  /* ================================================================
   * LIST — GET /catalog/products/:productId/images
   * ================================================================ */

  listByProduct = async (
    req: Request<{ productId: string }>,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const user = requireUser(req);
      const images = await this.service.listByProduct(req.params.productId, {
        userId: user.id,
      });

      return res.json({
        success: true,
        data: images,
      });
    } catch (error) {
      next(error);
    }
  };

  /* ================================================================
   * UPDATE — PATCH /catalog/images/:id
   * ================================================================ */

  update = async (
    req: Request<{ id: string }, {}, UpdateProductImageDto>,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const user = requireUser(req);
      const image = await this.service.updateImage(req.params.id, req.body, {
        userId: user.id,
      });

      return res.json({
        success: true,
        data: image,
      });
    } catch (error) {
      next(error);
    }
  };

  /* ================================================================
   * DELETE — DELETE /catalog/images/:id
   * ================================================================ */

  delete = async (
    req: Request<{ id: string }>,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const user = requireUser(req);
      const result = await this.service.deleteImage(req.params.id, {
        userId: user.id,
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
   * REORDER — POST /catalog/products/:productId/images/reorder
   * ================================================================ */

  reorder = async (
    req: Request<{ productId: string }, {}, ReorderBody>,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const user = requireUser(req);
      const images = await this.service.reorderImages(
        req.params.productId,
        req.body.imageIds,
        { userId: user.id },
      );

      return res.json({
        success: true,
        data: images,
      });
    } catch (error) {
      next(error);
    }
  };
}

/* Export du schéma pour l'utiliser dans les routes */
export { reorderBodySchema };