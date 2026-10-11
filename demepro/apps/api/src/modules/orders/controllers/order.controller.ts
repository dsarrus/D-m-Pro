// apps/api/src/modules/orders/controllers/order.controller.ts

import type { Request, Response, NextFunction } from "express";

import { OrderService } from "../services/order.service";

import type {
  CreateOrderDto,
  ShipOrderDto,
  CancelOrderDto,
  DeliverOrderDto,
} from "../dtos/order.dto";

export class OrderController {
  constructor(private readonly service: OrderService) {}

  /* ================================================================
   * CREATE
   * ================================================================ */

  create = async (
    req: Request<{}, {}, CreateOrderDto>,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const order = await this.service.createOrder(req.body, {
        userId: req.user!.id,
        role: req.user!.role,
      });

      return res.status(201).json({ success: true, data: order });
    } catch (error) {
      next(error);
    }
  };

  /* ================================================================
   * GET / LIST
   * ================================================================ */

  getById = async (
    req: Request<{ id: string }>,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const order = await this.service.getOrder(req.params.id, {
        userId: req.user!.id,
        role: req.user!.role,
      });

      return res.json({ success: true, data: order });
    } catch (error) {
      next(error);
    }
  };

  listMine = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const { status, limit, cursor } = req.query as {
        status?: string;
        limit?: string;
        cursor?: string;
      };

      const result = await this.service.listMyOrders(
        { userId: req.user!.id, role: req.user!.role },
        {
          status,
          limit: limit ? Number(limit) : undefined,
          cursor: cursor ?? null,
        },
      );

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

  listStoreOrders = async (
    req: Request<{ storeId: string }>,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const { status, limit, cursor } = req.query as {
        status?: string;
        limit?: string;
        cursor?: string;
      };

      const result = await this.service.listStoreOrders(
        req.params.storeId,
        { userId: req.user!.id, role: req.user!.role },
        {
          status,
          limit: limit ? Number(limit) : undefined,
          cursor: cursor ?? null,
        },
      );

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
   * ACTIONS
   * ================================================================ */

  ship = async (
    req: Request<{ id: string }, {}, ShipOrderDto>,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const order = await this.service.shipOrder(
        req.params.id,
        req.body,
        { userId: req.user!.id, role: req.user!.role },
      );

      return res.json({ success: true, data: order });
    } catch (error) {
      next(error);
    }
  };

  deliver = async (
    req: Request<{ id: string }, {}, DeliverOrderDto>,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const order = await this.service.deliverOrder(
        req.params.id,
        req.body,
        { userId: req.user!.id, role: req.user!.role },
      );

      return res.json({ success: true, data: order });
    } catch (error) {
      next(error);
    }
  };

  cancel = async (
    req: Request<{ id: string }, {}, CancelOrderDto>,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const order = await this.service.cancelOrder(
        req.params.id,
        req.body,
        { userId: req.user!.id, role: req.user!.role },
      );

      return res.json({ success: true, data: order });
    } catch (error) {
      next(error);
    }
  };
}