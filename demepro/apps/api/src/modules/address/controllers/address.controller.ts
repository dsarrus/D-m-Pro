// apps/api/src/modules/address/controllers/address.controller.ts

import type { Request, Response, NextFunction } from "express";

import { AddressService } from "../services/address.service";

import type {
  CreateAddressDto,
  UpdateAddressDto,
} from "../dtos/address.dto";

export class AddressController {
  constructor(private readonly service: AddressService) {}

  /* ================================================================
   * CREATE
   * ================================================================ */

  create = async (
    req: Request<{}, {}, CreateAddressDto>,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const address = await this.service.createAddress(req.body, {
        userId: req.user!.id,
        role: req.user!.role,
      });

      return res.status(201).json({ success: true, data: address });
    } catch (error) {
      next(error);
    }
  };

  /* ================================================================
   * LIST
   * ================================================================ */

  listMine = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const addresses = await this.service.listMyAddresses({
        userId: req.user!.id,
      });

      return res.json({ success: true, data: addresses });
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
      const address = await this.service.getAddress(req.params.id, {
        userId: req.user!.id,
      });

      return res.json({ success: true, data: address });
    } catch (error) {
      next(error);
    }
  };

  getDefault = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const address = await this.service.getDefaultAddress({
        userId: req.user!.id,
      });

      return res.json({ success: true, data: address });
    } catch (error) {
      next(error);
    }
  };

  /* ================================================================
   * UPDATE
   * ================================================================ */

  update = async (
    req: Request<{ id: string }, {}, UpdateAddressDto>,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const address = await this.service.updateAddress(
        req.params.id,
        req.body,
        { userId: req.user!.id, role: req.user!.role },
      );

      return res.json({ success: true, data: address });
    } catch (error) {
      next(error);
    }
  };

  /* ================================================================
   * SET DEFAULT
   * ================================================================ */

  setDefault = async (
    req: Request<{ id: string }>,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const address = await this.service.setDefaultAddress(
        req.params.id,
        { userId: req.user!.id, role: req.user!.role },
      );

      return res.json({ success: true, data: address });
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
      const result = await this.service.deleteAddress(req.params.id, {
        userId: req.user!.id,
        role: req.user!.role,
      });

      return res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  };
}