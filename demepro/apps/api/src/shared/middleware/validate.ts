import type { Request, Response, NextFunction } from "express";

import type { ZodType } from "zod";

export function validate(
  schema: ZodType,
  source: "body" | "query" | "params" = "body",
) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req[source]);

    if (!result.success) {
      return res.status(400).json({
        success: false,

        error: {
          code: "VALIDATION_ERROR",

          message: "Les données fournies sont invalides.",

          details: result.error.issues.map((issue) => ({
            field: issue.path.join("."),
            message: issue.message,
            code: issue.code,
          })),
        },
      });
    }

    req[source] = result.data;

    next();
  };
}
