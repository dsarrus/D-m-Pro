// apps/api/src/modules/services/controllers/service.controller.ts

import type { Request, Response, NextFunction } from "express";

import { ServiceService } from "../services/service.service";

import type {
  CreateServiceDto,
  CreateServiceFullDto,
  UpdateServiceDto,
  ServiceImageDto,
  ServiceZoneDto,
  AvailabilityDto,
} from "../dtos/service.dto";

export class ServiceController {
  constructor(private readonly service: ServiceService) {}

  /* ================================================================
   * CREATE
   * ================================================================ */

  create = async (
    req: Request<{}, {}, CreateServiceDto>,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const service = await this.service.createService(req.body, {
        userId: req.user!.id,
        role: req.user!.role,
      });

      return res.status(201).json({ success: true, data: service });
    } catch (error) {
      next(error);
    }
  };

  createFull = async (
    req: Request<{}, {}, CreateServiceFullDto>,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const service = await this.service.createServiceFull(req.body, {
        userId: req.user!.id,
        role: req.user!.role,
      });

      return res.status(201).json({ success: true, data: service });
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
      const service = await this.service.getService(req.params.id);
      return res.json({ success: true, data: service });
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
      const services = await this.service.listMyServices({
        userId: req.user!.id,
      });

      return res.json({ success: true, data: services });
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
      const result = await this.service.listServices(req.query as any);
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
    req: Request<{ id: string }, {}, UpdateServiceDto>,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const service = await this.service.updateService(
        req.params.id,
        req.body,
        { userId: req.user!.id, role: req.user!.role },
      );

      return res.json({ success: true, data: service });
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
      const service = await this.service.activateService(req.params.id, {
        userId: req.user!.id,
        role: req.user!.role,
      });

      return res.json({ success: true, data: service });
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
      const service = await this.service.archiveService(req.params.id, {
        userId: req.user!.id,
        role: req.user!.role,
      });

      return res.json({ success: true, data: service });
    } catch (error) {
      next(error);
    }
  };

  /* ================================================================
   * IMAGES
   * ================================================================ */

  addImage = async (
    req: Request<{ id: string }, {}, ServiceImageDto>,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const image = await this.service.addImage(
        req.params.id,
        req.body,
        { userId: req.user!.id, role: req.user!.role },
      );

      return res.status(201).json({ success: true, data: image });
    } catch (error) {
      next(error);
    }
  };

  deleteImage = async (
    req: Request<{ imageId: string }>,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const result = await this.service.deleteImage(req.params.imageId, {
        userId: req.user!.id,
        role: req.user!.role,
      });

      return res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  };

  reorderImages = async (
    req: Request<{ id: string }, {}, { imageIds: string[] }>,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const images = await this.service.reorderImages(
        req.params.id,
        req.body.imageIds,
        { userId: req.user!.id, role: req.user!.role },
      );

      return res.json({ success: true, data: images });
    } catch (error) {
      next(error);
    }
  };

  /* ================================================================
   * ZONES
   * ================================================================ */

  addZone = async (
    req: Request<{ id: string }, {}, ServiceZoneDto>,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const zone = await this.service.addZone(
        req.params.id,
        req.body,
        { userId: req.user!.id, role: req.user!.role },
      );

      return res.status(201).json({ success: true, data: zone });
    } catch (error) {
      next(error);
    }
  };

  deleteZone = async (
    req: Request<{ zoneId: string }>,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const result = await this.service.deleteZone(req.params.zoneId, {
        userId: req.user!.id,
        role: req.user!.role,
      });

      return res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  };

  /* ================================================================
   * AVAILABILITIES
   * ================================================================ */

  addAvailability = async (
    req: Request<{ id: string }, {}, AvailabilityDto>,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const availability = await this.service.addAvailability(
        req.params.id,
        req.body,
        { userId: req.user!.id, role: req.user!.role },
      );

      return res.status(201).json({ success: true, data: availability });
    } catch (error) {
      next(error);
    }
  };

  deleteAvailability = async (
    req: Request<{ availabilityId: string }>,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const result = await this.service.deleteAvailability(
        req.params.availabilityId,
        { userId: req.user!.id, role: req.user!.role },
      );

      return res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  };
}