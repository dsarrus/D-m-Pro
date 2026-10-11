/**
 * apps/api/src/modules/identity/infrastructure/repositories/refresh-token.repository.ts
 */

import { prisma } from "../../../infrastructure/database/prisma";

export class RefreshTokenRepository {
  async create(data: {
    userId: string;
    tokenHash: string;
    familyId: string;
    expiresAt: Date;
  }) {
    return prisma.refreshToken.create({
      data,
    });
  }

  async findByHash(tokenHash: string) {
    return prisma.refreshToken.findUnique({
      where: {
        tokenHash,
      },
    });
  }

  async revoke(id: string, replacedBy?: string) {
    return prisma.refreshToken.update({
      where: { id },
      data: {
        revokedAt: new Date(),
        replacedBy,
      },
    });
  }

  async revokeFamily(familyId: string) {
    return prisma.refreshToken.updateMany({
      where: {
        familyId,
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
      },
    });
  }
}
