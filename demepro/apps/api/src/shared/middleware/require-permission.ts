// apps/api/src/shared/middleware/require-permission.ts

import type { Request, Response, NextFunction } from "express";

import {
  CatalogError,
  CatalogErrorCode,
} from "../../modules/catalog/errors/catalog.error";

/* ================================================================
 * TYPES
 * ================================================================ */

export type Permission = string;

/**
 * Mapping rôle → permissions.
 * À terme, ce mapping devrait venir de la DB.
 */
const ROLE_PERMISSIONS: Record<string, Permission[]> = {
  CLIENT: [
    "catalog.product.read",
    "catalog.product.create",
    "order.create",
    "order.read.own",      // ← AJOUTER si absent
    "order.cancel.own", 
    "order.payment.initiate",   // ← AJOUTER
    "order.payment.refund", 
    "review.create",
    "review.read",
    "address.*",
    "notification.read.own",
  ],

  PROFESSIONAL: [
    /* Catalog */
    "catalog.product.*",
    "catalog.variant.*",
    "catalog.image.*",
    "catalog.inventory.*",

    /* Store */
    "store.create",
    "store.read.own",
    "store.update.own",
    "store.activate",
    "store.close",

    /* Order (Phase 4) */
    "order.read.store",
    "order.update.store",
    "order.ship.store",
    "order.deliver.store",
    "order.cancel.store",

    /* Transverse */
    "address.*",
    "review.read",
    "review.report",
    "notification.read.own",
  ],

  ADMIN: [
    /* Store */
    "store.suspend",

    /* Category */
    "category.create",
    "category.update",
    "category.delete",

    /* Verification */
    "admin.verification.approve",
    "admin.verification.reject",
    "admin.verification.read",

    /*Order */
    "order.read.store",       
    "order.cancel.store",  
    "order.payment.refund",  
  ],

  SUPER_ADMIN: ["*"],
};

/* ================================================================
 * HELPERS
 * ================================================================ */

function roleHasPermission(
  role: string | undefined,
  permission: Permission,
): boolean {
  if (!role) return false;

  const permissions = ROLE_PERMISSIONS[role];
  if (!permissions) return false;

  for (const p of permissions) {
    if (p === "*") return true;

    if (p.endsWith(".*")) {
      const prefix = p.slice(0, -2);
      if (permission === prefix) return true;
      if (permission.startsWith(prefix + ".")) return true;
    }

    if (p === permission) return true;
  }

  return false;
}

/* ================================================================
 * MIDDLEWARE
 * ================================================================ */

export function requirePermission(permission: Permission) {
  return function (
    req: Request,
    _res: Response,
    next: NextFunction,
  ): void {
    try {
      /* ----- Mode test : bypass ----- */
      if (process.env.NODE_ENV === "test") {
        const hasTestHeader = req.header("X-Test-User-Id");
        if (hasTestHeader) {
          const testPerms = req.header("X-Test-Permissions");
          if (!testPerms) {
            return next();
          }
          const perms = testPerms.split(",").map((p: string) => p.trim());
          const has = perms.some(
            (p: string) =>
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