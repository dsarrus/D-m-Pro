// apps/api/src/shared/middleware/require-permission.ts

import type { Request, Response, NextFunction } from "express";

import { CatalogError, CatalogErrorCode } from "../../modules/catalog/errors/catalog.error";

/* ================================================================
 * TYPES
 * ================================================================ */

export type Permission = string; // ex: "catalog.product.create"

/**
 * Mapping rôle → permissions.
 * À terme, ce mapping devrait venir de la DB.
 */
const ROLE_PERMISSIONS: Record<string, Permission[]> = {
  CLIENT: [
    "catalog.product.read",
    "catalog.product.create", // TODO: retirer si non voulu
    "order.create",
  ],
  PROFESSIONAL: [
    "catalog.product.*",
    "catalog.variant.*",
    "catalog.image.*",
    "catalog.inventory.*",
    "store.*",
  ],
  ADMIN: ["*"],
  SUPER_ADMIN: ["*"],
};

/* ================================================================
 * HELPERS
 * ================================================================ */

/**
 * Vérifie si un rôle possède une permission.
 * Supporte le wildcard `*` en fin : "catalog.product.*"
 */
function roleHasPermission(
  role: string | undefined,
  permission: Permission,
): boolean {
  if (!role) return false;

  const permissions = ROLE_PERMISSIONS[role];
  if (!permissions) return false;

  for (const p of permissions) {
    /* Wildcard global */
    if (p === "*") return true;

    /* Wildcard de préfixe : "catalog.product.*" */
    if (p.endsWith(".*")) {
      const prefix = p.slice(0, -2); // "catalog.product"
      if (permission === prefix) return true;
      if (permission.startsWith(prefix + ".")) return true;
    }

    /* Match exact */
    if (p === permission) return true;
  }

  return false;
}

/* ================================================================
 * MIDDLEWARE
 * ================================================================ */

/**
 * Vérifie que `req.user` possède la permission requise.
 *
 * Doit être monté APRÈS `authenticate`.
 *
 * @param permission ex: "catalog.product.create"
 */
export function requirePermission(permission: Permission) {
  return function (
    req: Request,
    _res: Response,
    next: NextFunction,
  ): void {
    try {
      /* ----- Mode test : bypass ----- */
      if (process.env.NODE_ENV === "test") {
        // Si aucun header de test n'est fourni, on bypasse
        // (le middleware authenticate gère déjà le mode test)
        const hasTestHeader = req.header("X-Test-User-Id");
        if (hasTestHeader) {
          // Vérification optionnelle si X-Test-Permissions est fourni
          const testPerms = req.header("X-Test-Permissions");
          if (!testPerms) {
            return next(); // bypass total
          }
          const perms = testPerms.split(",").map((p:any) => p.trim());
          const has = perms.some(
            (p:any) =>
              p === "*" ||
              p === permission ||
              (p.endsWith(".*") &&
                permission.startsWith(p.slice(0, -2) + ".")),
          );
          if (!has) {
            throw new CatalogError(
              "UNAUTHORIZED" as CatalogErrorCode,
              `Permission manquante : ${permission}.`,
              403,
            );
          }
          return next();
        }
      }

      /* ----- Vérification user ----- */
      if (!req.user) {
        throw new CatalogError(
          "UNAUTHENTICATED" as CatalogErrorCode,
          "Utilisateur non authentifié.",
          401,
        );
      }

      /* ----- Vérification permission ----- */
      const hasPermission =
        roleHasPermission(req.user.role, permission) ||
        (req.user.permissions ?? []).includes(permission) ||
        (req.user.permissions ?? []).includes("*");

      if (!hasPermission) {
        throw new CatalogError(
          "UNAUTHORIZED" as CatalogErrorCode,
          `Permission manquante : ${permission}.`,
          403,
        );
      }

      return next();
    } catch (error) {
      return next(error);
    }
  };
}