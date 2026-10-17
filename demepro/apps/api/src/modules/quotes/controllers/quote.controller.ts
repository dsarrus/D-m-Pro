import type { Request, Response, NextFunction } from "express";
import { QuoteService, type AuthContext } from "../services/quote.service";
import {
  createQuoteSchema,
  respondToQuoteSchema,
  acceptQuoteSchema,
  rejectQuoteSchema,
  listQuotesQuerySchema,
  quoteIdParamSchema,
  serviceIdParamSchema,
} from "../dtos/quote.dto";
import { QuoteError } from "../errors/quote.error";

function getAuthContext(req: Request): AuthContext {
  return {
    userId: req.user!.id,
    role: req.user!.role,
    permissions: req.user!.permissions,
  };
}

export class QuoteController {
  constructor(private readonly service: QuoteService) {}

  create = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const dto = createQuoteSchema.parse(req.body);
      const quote = await this.service.createQuote(dto, getAuthContext(req));
      res.status(201).json({ success: true, data: quote });
    } catch (e) { next(e); }
  };

  getById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = quoteIdParamSchema.parse(req.params);
      const quote = await this.service.getQuote(id, getAuthContext(req));
      res.json({ success: true, data: quote });
    } catch (e) { next(e); }
  };

  listMine = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const query = listQuotesQuerySchema.parse(req.query);
      const result = await this.service.listMyQuotes(getAuthContext(req), query);
      res.json({ success: true, ...result });
    } catch (e) { next(e); }
  };

  listProfessional = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const query = listQuotesQuerySchema.parse(req.query);
      const result = await this.service.listProfessionalQuotes(getAuthContext(req), query);
      res.json({ success: true, ...result });
    } catch (e) { next(e); }
  };

  listByService = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { serviceId } = serviceIdParamSchema.parse(req.params);
      const query = listQuotesQuerySchema.parse(req.query);
      const result = await this.service.listServiceQuotes(serviceId, getAuthContext(req), query);
      res.json({ success: true, ...result });
    } catch (e) { next(e); }
  };

  respond = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = quoteIdParamSchema.parse(req.params);
      const dto = respondToQuoteSchema.parse(req.body);
      const result = await this.service.respondToQuote(id, dto, getAuthContext(req));
      res.json({ success: true, data: result });
    } catch (e) { next(e); }
  };

  accept = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = quoteIdParamSchema.parse(req.params);
      const dto = acceptQuoteSchema.parse(req.body);
      const result = await this.service.acceptQuote(id, dto, getAuthContext(req));
      res.json({ success: true, data: result });
    } catch (e) { next(e); }
  };

  reject = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = quoteIdParamSchema.parse(req.params);
      const dto = rejectQuoteSchema.parse(req.body);
      const quote = await this.service.rejectQuote(id, dto, getAuthContext(req));
      res.json({ success: true, data: quote });
    } catch (e) { next(e); }
  };
}