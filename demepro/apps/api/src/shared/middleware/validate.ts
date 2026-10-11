// apps/api/src/shared/middleware/validate.ts

import type { Request, Response, NextFunction } from "express";
import type { ZodType } from "zod";

type ValidationSource = "body" | "query" | "params";

export function validate(
  schema: ZodType,
  source: ValidationSource = "body",
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const raw =
      source === "body"
        ? req.body
        : source === "query"
        ? req.query
        : req.params;

    const result = schema.safeParse(raw);

    if (!result.success) {
      res.status(400).json({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Les données fournies sont invalides.",
          statusCode: 400,
          details: result.error.issues.map((issue) => ({
            field: issue.path.join("."),
            message: issue.message,
            code: issue.code,
          })),
        },
      });
      return;
    }

    /* Express 5 : req.query et req.params sont en lecture seule.
     * On utilise Object.defineProperty pour les réassigner. */
    if (source === "body") {
      req.body = result.data;
    } else if (source === "query") {
      Object.defineProperty(req, "query", {
        value: result.data,
        writable: true,
        configurable: true,
      });
    } else {
      Object.defineProperty(req, "params", {
        value: result.data,
        writable: true,
        configurable: true,
      });
    }

    next();
  };
}