// apps/api/src/modules/notifications/controllers/notification.controller.ts

import type { Request, Response, NextFunction } from "express";

import { NotificationService } from "../services/notification.service";

export class NotificationController {
  constructor(private readonly service: NotificationService) {}

  listMine = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const { unreadOnly, limit, cursor } = req.query as {
        unreadOnly?: string;
        limit?: string;
        cursor?: string;
      };

      const result = await this.service.listMyNotifications(
        { userId: req.user!.id },
        {
          unreadOnly: unreadOnly === "true",
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

  unreadCount = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const count = await this.service.getUnreadCount({
        userId: req.user!.id,
      });

      return res.json({
        success: true,
        data: { count },
      });
    } catch (error) {
      next(error);
    }
  };

  markAsRead = async (
    req: Request<{ id: string }>,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const notification = await this.service.markAsRead(req.params.id, {
        userId: req.user!.id,
      });

      return res.json({ success: true, data: notification });
    } catch (error) {
      next(error);
    }
  };

  markAllAsRead = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const result = await this.service.markAllAsRead({
        userId: req.user!.id,
      });

      return res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  };
}