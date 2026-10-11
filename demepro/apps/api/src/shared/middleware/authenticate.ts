// apps/api/src/shared/middleware/authenticate.ts

import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

import {
  CatalogError,
  CatalogErrorCode,
} from "../../modules/catalog/errors/catalog.error";

/* ================================================================
 * TYPES
 * ================================================================ */

export type JwtPayload = {
  sub: string; // userId
  role?: string;
  permissions?: string[];
  iat?: number;
  exp?: number;
};

/**
 * Étend Express.Request pour typer `req.user`.
 * À déclarer une seule fois dans le projet.
 */
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: {
        id: string;
        role?: string;
        permissions?: string[];
      };
    }
  }
}

/* ================================================================
 * CONFIG
 * ================================================================ */

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET && process.env.NODE_ENV !== "test") {
  throw new Error(
    "JWT_SECRET is not defined. Refusing to start without a secret.",
  );
}

/* ================================================================
 * MIDDLEWARE
 * ================================================================ */

/**
 * Vérifie la présence et la validité du Bearer token.
 * Injecte `req.user` si valide.
 * Sinon, retourne 401.
 */
export function authenticate(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  try {
    /* ----- Mode test : bypass via header ----- */
    if (process.env.NODE_ENV === "test") {
      const testUserId = req.header("X-Test-User-Id");
      if (testUserId) {
        req.user = {
          id: testUserId,
          role: req.header("X-Test-Role") ?? "PROFESSIONAL",
          permissions: (req.header("X-Test-Permissions") ?? "")
            .split(",")
            .map((p:any) => p.trim())
            .filter(Boolean),
        };
        return next();
      }
    }

    /* ----- Extraction du token ----- */
    const authHeader = req.header("Authorization");

    if (!authHeader) {
      throw new CatalogError(
        "UNAUTHENTICATED" as CatalogErrorCode,
        "Token d'authentification manquant.",
        401,
      );
    }

    const [scheme, token] = authHeader.split(" ");

    if (scheme !== "Bearer" || !token) {
      throw new CatalogError(
        "UNAUTHENTICATED" as CatalogErrorCode,
        "Format du token invalide.",
        401,
      );
    }

    /* ----- Vérification ----- */
    const payload = jwt.verify(token, JWT_SECRET!) as JwtPayload;

    if (!payload.sub) {
      throw new CatalogError(
        "UNAUTHENTICATED" as CatalogErrorCode,
        "Token invalide : sub manquant.",
        401,
      );
    }

    /* ----- Injection ----- */
    req.user = {
      id: payload.sub,
      role: payload.role,
      permissions: payload.permissions,
    };

    return next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return next(
        new CatalogError(
          "TOKEN_EXPIRED" as CatalogErrorCode,
          "Token expiré.",
          401,
        ),
      );
    }

    if (error instanceof jwt.JsonWebTokenError) {
      return next(
        new CatalogError(
          "UNAUTHENTICATED" as CatalogErrorCode,
          "Token invalide.",
          401,
        ),
      );
    }

    return next(error);
  }
}