// apps/api/src/modules/category/controllers/category.controller.ts

import type { Request, Response, NextFunction } from "express";

import { CategoryService } from "../services/category.service";

import type {
  CreateCategoryDto,
  UpdateCategoryDto,
} from "../dtos/category.dto";

export class CategoryController {
  constructor(private readonly service: CategoryService) {}

  /* ================================================================
   * CREATE (admin)
   * ================================================================ */

  create = async (
    req: Request<{}, {}, CreateCategoryDto>,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const category = await this.service.createCategory(req.body, {
        userId: req.user!.id,
        role: req.user!.role,
      });

      return res.status(201).json({ success: true, data: category });
    } catch (error) {
      next(error);
    }
  };

  /* ================================================================
   * GET / LIST (public)
   * ================================================================ */

  getById = async (
    req: Request<{ id: string }>,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const category = await this.service.getCategory(req.params.id);
      return res.json({ success: true, data: category });
    } catch (error) {
      next(error);
    }
  };

  list = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const result = await this.service.listCategories(req.query as any);
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

  listChildren = async (
    req: Request<{ id: string }>,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const children = await this.service.listChildren(req.params.id);
      return res.json({ success: true, data: children });
    } catch (error) {
      next(error);
    }
  };

  getTreeByVertical = async (
    req: Request<{ verticalId: string }>,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const tree = await this.service.getTreeByVertical(
        req.params.verticalId,
      );
      return res.json({ success: true, data: tree });
    } catch (error) {
      next(error);
    }
  };

  /* ================================================================
   * UPDATE (admin)
   * ================================================================ */

  update = async (
    req: Request<{ id: string }, {}, UpdateCategoryDto>,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const category = await this.service.updateCategory(
        req.params.id,
        req.body,
        { userId: req.user!.id, role: req.user!.role },
      );

      return res.json({ success: true, data: category });
    } catch (error) {
      next(error);
    }
  };

  /* ================================================================
   * DELETE (admin)
   * ================================================================ */

  delete = async (
    req: Request<{ id: string }>,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const result = await this.service.deleteCategory(req.params.id, {
        userId: req.user!.id,
        role: req.user!.role,
      });

      return res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  };
}