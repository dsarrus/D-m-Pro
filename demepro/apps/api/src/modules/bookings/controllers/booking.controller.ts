// apps/api/src/modules/bookings/controllers/booking.controller.ts

import type { Request, Response, NextFunction } from "express";

import { BookingService } from "../services/booking.service";

import type {
  CreateBookingDto,
  CompleteBookingDto,
  CancelBookingDto,
  ListBookingsQuery,
} from "../dtos/booking.dto";

function getAuthContext(req: Request) {
  return {
    userId: req.user!.id,
    role: req.user!.role,
    permissions: req.user!.permissions ?? [],
  };
}

export class BookingController {
  constructor(private readonly service: BookingService) {}

  /* ------------------------------------------------------------------
   * CREATE
   * ------------------------------------------------------------------ */

  create = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const dto = req.body as CreateBookingDto;
      const booking = await this.service.createBooking(dto, getAuthContext(req));
      res.status(201).json({ success: true, data: booking });
    } catch (err) {
      next(err);
    }
  };

  /* ------------------------------------------------------------------
   * LECTURES
   * ------------------------------------------------------------------ */

  getById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const booking = await this.service.getBooking(
        req.params.id,
        getAuthContext(req),
      );
      res.json({ success: true, data: booking });
    } catch (err) {
      next(err);
    }
  };

  listMine = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const query = req.query as unknown as ListBookingsQuery;
      const result = await this.service.listMyBookings(getAuthContext(req), query);
      res.json({ success: true, ...result });
    } catch (err) {
      next(err);
    }
  };

  listProfessional = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const query = req.query as unknown as ListBookingsQuery;
      const result = await this.service.listProfessionalBookings(
        getAuthContext(req),
        query,
      );
      res.json({ success: true, ...result });
    } catch (err) {
      next(err);
    }
  };

  listByService = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const query = req.query as unknown as ListBookingsQuery;
      const result = await this.service.listServiceBookings(
        req.params.serviceId,
        getAuthContext(req),
        query,
      );
      res.json({ success: true, ...result });
    } catch (err) {
      next(err);
    }
  };

  /* ------------------------------------------------------------------
   * ACTIONS
   * ------------------------------------------------------------------ */

  start = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const booking = await this.service.startBooking(
        req.params.id,
        getAuthContext(req),
      );
      res.json({ success: true, data: booking });
    } catch (err) {
      next(err);
    }
  };

  complete = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const dto = req.body as CompleteBookingDto;
      const booking = await this.service.completeBooking(
        req.params.id,
        dto,
        getAuthContext(req),
      );
      res.json({ success: true, data: booking });
    } catch (err) {
      next(err);
    }
  };

  cancel = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const dto = req.body as CancelBookingDto;
      const booking = await this.service.cancelBooking(
        req.params.id,
        dto,
        getAuthContext(req),
      );
      res.json({ success: true, data: booking });
    } catch (err) {
      next(err);
    }
  };

  noShow = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const booking = await this.service.noShowBooking(
        req.params.id,
        getAuthContext(req),
      );
      res.json({ success: true, data: booking });
    } catch (err) {
      next(err);
    }
  };
}