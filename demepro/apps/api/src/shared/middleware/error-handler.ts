// apps/api/src/shared/middleware/error-handler.ts

import type { Request, Response, NextFunction } from "express";

/* ================================================================
 * DÉTECTION GÉNÉRIQUE
 * ================================================================ */

/**
 * Détecte toute erreur métier ayant `code` (string) et `statusCode` (number).
 *
 * Couvre : CatalogError, StoreError, CategoryError, VerificationError,
 * et toutes les futures erreurs du même format.
 */
function isAppError(error: unknown): error is {
  code: string;
  message: string;
  statusCode: number;
  details?: unknown;
} {
  return (
    error !== null &&
    typeof error === "object" &&
    "code" in error &&
    typeof (error as any).code === "string" &&
    "message" in error &&
    typeof (error as any).message === "string" &&
    "statusCode" in error &&
    typeof (error as any).statusCode === "number"
  );
}

/* ================================================================
 * ERROR HANDLER
 * ================================================================ */

export function errorHandler(
  error: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  /* ----- Erreur métier (Catalog, Store, Category, Verification) ----- */
  if (isAppError(error)) {
    res.status(error.statusCode).json({
      success: false,
      error: {
        code: error.code,
        message: error.message,
        statusCode: error.statusCode,
        ...(error.details ? { details: error.details } : {}),
      },
    });
    return;
  }

  /* ----- ZodError ----- */
  if (
    error !== null &&
    typeof error === "object" &&
    "name" in error &&
    (error as any).name === "ZodError"
  ) {
    res.status(400).json({
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "Les données fournies sont invalides.",
        statusCode: 400,
        details: (error as any).issues,
      },
    });
    return;
  }

  /* ----- Fallback ----- */
  console.error("[errorHandler] Unhandled error:", error);
  res.status(500).json({
    success: false,
    error: {
      code: "INTERNAL_ERROR",
      message: "Erreur interne.",
      statusCode: 500,
    },
  });
}