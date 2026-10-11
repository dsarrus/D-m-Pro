/**
 * apps/api/src/modules/identity/presentation/auth.middleware.ts
 */

import type { NextFunction, Request, Response } from "express";

import { TokenService } from "../application/token.service";
import { AuthRepository } from "../infrastructure/repositories/auth.repository";

const tokens = new TokenService();
const users = new AuthRepository();

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string | null;
    phone: string | null;
    firstName: string;
    lastName: string;
    status: string;
    permissions: string[];
    roles: string[];
  };
}

export async function requireAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const header = req.headers.authorization;

    if (!header?.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        error: {
          code: "UNAUTHORIZED",
          message: "Authentification requise",
        },
      });
    }

    const token = header.slice(7);

    const payload = tokens.verifyAccessToken(token);

    const user = await users.findById(payload.sub);

    if (!user || user.status !== "ACTIVE") {
      return res.status(401).json({
        success: false,
        error: {
          code: "UNAUTHORIZED",
          message: "Compte non autorisé",
        },
      });
    }

    const roles = user.roleAssignments.map(
      (assignment) => assignment.role.code,
    );

    const permissions = user.roleAssignments.flatMap((assignment) =>
      assignment.role.permissions.map(
        (permission) => permission.permission.code,
      ),
    );

    req.user = {
      id: user.id,
      email: user.email,
      phone: user.phone,
      firstName: user.firstName,
      lastName: user.lastName,
      status: user.status,
      roles: [...new Set(roles)],
      permissions: [...new Set(permissions)],
    };

    next();
  } catch {
    return res.status(401).json({
      success: false,
      error: {
        code: "INVALID_TOKEN",
        message: "Token invalide ou expiré",
      },
    });
  }
}

export function requirePermission(permission: string) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: {
          code: "UNAUTHORIZED",
          message: "Authentification requise",
        },
      });
    }

    if (!req.user.permissions.includes(permission)) {
      return res.status(403).json({
        success: false,
        error: {
          code: "FORBIDDEN",
          message: "Permission insuffisante",
        },
      });
    }

    next();
  };
}
