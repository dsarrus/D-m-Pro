// apps/api/src/shared/middleware/error-handler.ts

import type { Request, Response, NextFunction } from "express";
import { CatalogError } from "../../modules/catalog/errors/catalog.error";

export function errorHandler(
  error: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  /* ----- CatalogError avec statusCode ----- */
  if (error instanceof CatalogError) {
    res.status(error.statusCode).json({
      success: false,
      error: {
        code: error.code,
        message: error.message,
        statusCode: error.statusCode,
      },
    });
    return;
  }

  /* ----- Zod (si le middleware validate ne l'attrape pas) ----- */
  if (
    error &&
    typeof error === "object" &&
    "name" in error &&
    (error as any).name === "ZodError"
  ) {
    res.status(400).json({
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "Les données fournies sont invalides.",
        details: (error as any).issues,
      },
    });
    return;
  }

  /* ----- Fallback ----- */
  console.error("[errorHandler]", error);
  res.status(500).json({
    success: false,
    error: {
      code: "INTERNAL_ERROR",
      message: "Erreur interne.",
      statusCode: 500,
    },
  });
}