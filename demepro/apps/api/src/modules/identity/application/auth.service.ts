/**
 * apps/api/src/modules/identity/application/auth.service.ts
 */

// Service applicatif / infrastructure

import crypto from "node:crypto";

import {
  AccountPendingError,
  AccountSuspendedError,
  InvalidCredentialsError,
  RefreshTokenInvalidError,
} from "../domain/identity.errors";

import { AuthRepository } from "../infrastructure/repositories/auth.repository";
import { RefreshTokenRepository } from "../infrastructure/repositories/refresh-token.repository";
import { Argon2PasswordService } from "../infrastructure/password/argon2-password.service";

import { TokenService } from "./token.service";
import { hashToken } from "../../../shared/security/crypto";

export class AuthService {
  constructor(
    private readonly users = new AuthRepository(),
    private readonly refreshTokens = new RefreshTokenRepository(),
    private readonly passwords = new Argon2PasswordService(),
    private readonly tokens = new TokenService(),
  ) {}

  async register(input: {
    email?: string;
    phone?: string;
    password: string;
    firstName: string;
    lastName: string;
  }) {
    if (input.email) {
      const existing = await this.users.findByEmail(input.email.toLowerCase());

      if (existing) {
        throw new Error("Adresse email déjà utilisée");
      }
    }

    if (input.phone) {
      const existing = await this.users.findByPhone(input.phone);

      if (existing) {
        throw new Error("Numéro de téléphone déjà utilisé");
      }
    }

    const passwordHash = await this.passwords.hash(input.password);

    const user = await this.users.create({
      email: input.email?.toLowerCase(),
      phone: input.phone,
      passwordHash,
      firstName: input.firstName,
      lastName: input.lastName,
    });

    return {
      id: user.id,
      email: user.email,
      phone: user.phone,
      firstName: user.firstName,
      lastName: user.lastName,
      status: user.status,
    };
  }

  async login(identifier: string, password: string) {
    const normalized = identifier.toLowerCase();

    const user = normalized.includes("@")
      ? await this.users.findByEmail(normalized)
      : await this.users.findByPhone(identifier);

    if (!user || !user.passwordHash) {
      throw new InvalidCredentialsError();
    }

    const valid = await this.passwords.verify(user.passwordHash, password);

    if (!valid) {
      throw new InvalidCredentialsError();
    }

    if (user.status === "SUSPENDED") {
      throw new AccountSuspendedError();
    }

    if (user.status === "PENDING") {
      throw new AccountPendingError();
    }

    await this.users.updateLastLogin(user.id);

    return this.issueTokens(user.id);
  }

  async refresh(refreshToken: string) {
    let payload;

    try {
      payload = this.tokens.verifyRefreshToken(refreshToken);
    } catch {
      throw new RefreshTokenInvalidError();
    }

    const tokenHash = hashToken(refreshToken);

    const stored = await this.refreshTokens.findByHash(tokenHash);

    if (!stored || stored.revokedAt) {
      if (stored) {
        await this.refreshTokens.revokeFamily(stored.familyId);
      }

      throw new RefreshTokenInvalidError();
    }

    if (stored.expiresAt < new Date()) {
      throw new RefreshTokenInvalidError();
    }

    if (stored.userId !== payload.sub) {
      throw new RefreshTokenInvalidError();
    }

    const next = await this.issueTokens(payload.sub, stored.familyId);

    const nextHash = hashToken(next.refreshToken);

    const nextStored = await this.refreshTokens.findByHash(nextHash);

    await this.refreshTokens.revoke(stored.id, nextStored?.id);

    return next;
  }

  async logout(refreshToken: string) {
    const tokenHash = hashToken(refreshToken);

    const stored = await this.refreshTokens.findByHash(tokenHash);

    if (!stored) {
      return;
    }

    await this.refreshTokens.revokeFamily(stored.familyId);
  }

  private async issueTokens(userId: string, existingFamilyId?: string) {
    const familyId = existingFamilyId ?? crypto.randomUUID();

    const accessToken = this.tokens.generateAccessToken(userId);

    const refresh = this.tokens.generateRefreshToken(userId, familyId);

    const refreshTokenHash = hashToken(refresh.token);

    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    await this.refreshTokens.create({
      userId,
      tokenHash: refreshTokenHash,
      familyId,
      expiresAt,
    });

    return {
      accessToken,
      refreshToken: refresh.token,
      expiresIn: 15 * 60,
    };
  }
}
