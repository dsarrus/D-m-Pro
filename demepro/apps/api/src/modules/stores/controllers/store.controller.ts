// apps/api/src/modules/stores/controllers/store.controller.ts

import type { Request, Response, NextFunction } from "express";

import { StoreService } from "../services/store.service";

import type {
  CreateStoreDto,
  UpdateStoreDto,
} from "../dtos/store.dto";

export class StoreController {
  constructor(private readonly service: StoreService) {}

  /* ================================================================
   * CREATE
   * ================================================================ */

  create = async (
    req: Request<{}, {}, CreateStoreDto>,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const store = await this.service.createStore(req.body, {
        userId: req.user!.id,
        role: req.user!.role,
      });

      return res.status(201).json({ success: true, data: store });
    } catch (error) {
      next(error);
    }
  };

  /* ================================================================
   * GET
   * ================================================================ */

  getMyStore = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const store = await this.service.getMyStore({
        userId: req.user!.id,
      });

      return res.json({ success: true, data: store });
    } catch (error) {
      next(error);
    }
  };

  getBySlug = async (
    req: Request<{ slug: string }>,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const store = await this.service.getPublicBySlug(req.params.slug);
      return res.json({ success: true, data: store });
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
      const store = await this.service.getById(req.params.id, {
        userId: req.user!.id,
        role: req.user!.role,
      });

      return res.json({ success: true, data: store });
    } catch (error) {
      next(error);
    }
  };

  /* ================================================================
   * LIST (public)
   * ================================================================ */

  listActive = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const { limit, cursor } = req.query as {
        limit?: string;
        cursor?: string;
      };

      const result = await this.service.listActive({
        limit: limit ? Number(limit) : undefined,
        cursor: cursor ?? null,
      });

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

  /* ================================================================
   * UPDATE
   * ================================================================ */

  update = async (
    req: Request<{ id: string }, {}, UpdateStoreDto>,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const store = await this.service.updateStore(
        req.params.id,
        req.body,
        { userId: req.user!.id, role: req.user!.role },
      );

      return res.json({ success: true, data: store });
    } catch (error) {
      next(error);
    }
  };

  /* ================================================================
   * ACTIONS
   * ================================================================ */

  activate = async (
    req: Request<{ id: string }>,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const store = await this.service.activateStore(req.params.id, {
        userId: req.user!.id,
        role: req.user!.role,
      });

      return res.json({ success: true, data: store });
    } catch (error) {
      next(error);
    }
  };

  suspend = async (
    req: Request<{ id: string }>,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const store = await this.service.suspendStore(req.params.id, {
        userId: req.user!.id,
        role: req.user!.role,
      });

      return res.json({ success: true, data: store });
    } catch (error) {
      next(error);
    }
  };

  close = async (
    req: Request<{ id: string }>,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const store = await this.service.closeStore(req.params.id, {
        userId: req.user!.id,
        role: req.user!.role,
      });

      return res.json({ success: true, data: store });
    } catch (error) {
      next(error);
    }
  };
}