import type { Request, Response, NextFunction } from "express";
import { ProductService } from "../services/product.service";
import type {
  CreateProductDto,
  CreateProductWithRelationsDto,
  UpdateProductDto,
} from "../dto/product.dto";

export class ProductController {
  constructor(private readonly service: ProductService) {}

  create = async (
    req: Request<{}, {}, CreateProductDto>,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const result = await this.service.createProduct(
        req.body,
        { userId: req.user.id },
        req.header("Idempotency-Key") ?? undefined,
      );
      return res.status(201).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  };

  createFull = async (
    req: Request<{}, {}, CreateProductWithRelationsDto>,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const result = await this.service.createFull(
        req.body,
        { userId: req.user.id },
        req.header("Idempotency-Key") ?? undefined,
      );
      return res.status(201).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  };

  getById = async (
    req: Request<{ id: string }>,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const product = await this.service.getProduct(req.params.id);
      return res.json({ success: true, data: product });
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
      const { limit, cursor, status } = req.query as Record<string, string>;
      const products = await this.service.listByStore(
        req.params.storeId,
        { userId: req.user.id },
        {
          limit: limit ? Number(limit) : undefined,
          cursor: cursor ?? null,
          status: status as any,
        },
      );
      return res.json({ success: true, data: products });
    } catch (error) {
      next(error);
    }
  };

  update = async (
    req: Request<{ id: string }, {}, UpdateProductDto>,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const product = await this.service.updateProduct(
        req.params.id,
        req.body,
        { userId: req.user.id },
      );
      return res.json({ success: true, data: product });
    } catch (error) {
      next(error);
    }
  };

  archive = async (
    req: Request<{ id: string }>,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const product = await this.service.archiveProduct(req.params.id, {
        userId: req.user.id,
      });
      return res.json({ success: true, data: product });
    } catch (error) {
      next(error);
    }
  };

  activate = async (
    req: Request<{ id: string }>,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const product = await this.service.activateProduct(req.params.id, {
        userId: req.user.id,
      });
      return res.json({ success: true, data: product });
    } catch (error) {
      next(error);
    }
  };

  enableVariants = async (
    req: Request<{ id: string }>,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const product = await this.service.enableVariants(req.params.id, {
        userId: req.user.id,
      });
      return res.json({ success: true, data: product });
    } catch (error) {
      next(error);
    }
  };

  disableVariants = async (
    req: Request<{ id: string }, {}, { price: number | string }>,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const product = await this.service.disableVariants(
        req.params.id,
        req.body.price,
        { userId: req.user.id },
      );
      return res.json({ success: true, data: product });
    } catch (error) {
      next(error);
    }
  };

  delete = async (
    req: Request<{ id: string }>,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const result = await this.service.deleteProduct(req.params.id, {
        userId: req.user.id,
      });
      return res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  };
}
