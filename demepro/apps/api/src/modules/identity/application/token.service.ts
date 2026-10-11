import crypto from "node:crypto";
import jwt from "jsonwebtoken";

interface AccessPayload {
  sub: string;
  type: "access";
}

interface RefreshPayload {
  sub: string;
  jti: string;
  familyId: string;
  type: "refresh";
}

export class TokenService {
  private readonly accessSecret: string;
  private readonly refreshSecret: string;

  private readonly accessExpiresIn = "15m";
  private readonly refreshExpiresIn = "30d";

  constructor() {
    const accessSecret = process.env.JWT_ACCESS_SECRET;
    const refreshSecret = process.env.JWT_REFRESH_SECRET;

    if (!accessSecret || !refreshSecret) {
      throw new Error(
        "JWT_ACCESS_SECRET et JWT_REFRESH_SECRET sont obligatoires",
      );
    }

    this.accessSecret = accessSecret;
    this.refreshSecret = refreshSecret;
  }

  generateAccessToken(userId: string): string {
    const payload: AccessPayload = {
      sub: userId,
      type: "access",
    };

    return jwt.sign(payload, this.accessSecret, {
      expiresIn: this.accessExpiresIn,
    });
  }

  generateRefreshToken(
    userId: string,
    familyId: string,
  ): {
    token: string;
    jti: string;
  } {
    const jti = crypto.randomUUID();

    const payload: RefreshPayload = {
      sub: userId,
      jti,
      familyId,
      type: "refresh",
    };

    const token = jwt.sign(payload, this.refreshSecret, {
      expiresIn: this.refreshExpiresIn,
    });

    return {
      token,
      jti,
    };
  }

  verifyAccessToken(token: string): AccessPayload {
    const payload = jwt.verify(token, this.accessSecret) as AccessPayload;

    if (payload.type !== "access") {
      throw new Error("Type de token invalide");
    }

    return payload;
  }

  verifyRefreshToken(token: string): RefreshPayload {
    const payload = jwt.verify(token, this.refreshSecret) as RefreshPayload;

    if (payload.type !== "refresh") {
      throw new Error("Type de token invalide");
    }

    return payload;
  }
}
