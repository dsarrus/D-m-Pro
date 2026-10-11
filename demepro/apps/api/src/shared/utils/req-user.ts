// apps/api/src/shared/utils/req-user.ts

import type { Request } from "express";
import { CatalogError, CatalogErrorCode } from "../../modules/catalog/errors/catalog.error";

export function requireUser(req: Request): { id: string; role?: string } {
  if (!req.user) {
    throw new CatalogError(
      "UNAUTHENTICATED" as CatalogErrorCode,
      "Utilisateur non authentifié.",
      401,
    );
  }
  return req.user;
}