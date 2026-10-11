// apps/api/src/modules/catalog/services/idempotency.service.ts

import { createHash } from "crypto";

import { Prisma, PrismaClient } from "../../../generated/prisma/client";

import { CatalogError, CatalogErrorCode } from "../errors/catalog.error";

const TTL_MS = 24 * 60 * 60 * 1000; // 24h

/**
 * Enregistrement d'une clé d'idempotence.
 *
 * `scope` permet de distinguer plusieurs contextes pour
 * la même clé : par exemple `POST /catalog/products` vs
 * `POST /catalog/products/full`.
 */
export type IdempotencyRecord = {
  key: string;
  scope: string;
  userId: string;
  requestHash: string;
};

export type StoredResponse = {
  statusCode: number;
  body: unknown;
};

export class IdempotencyService {
  constructor(private readonly prisma: PrismaClient) {}

  /* ================================================================
   * HASH
   * ================================================================ */

  /**
   * Hash SHA-256 déterministe du payload.
   *
   * Attention : l'ordre des clés JSON doit être stable.
   * Pour des DTO Zod, l'ordre est garanti par le schéma.
   */
  hashRequest(payload: unknown): string {
    return createHash("sha256").update(JSON.stringify(payload)).digest("hex");
  }

  /* ================================================================
   * ACQUIRE
   * ================================================================ */

  /**
   * Tente de réserver la clé.
   *
   * - Clé absente → création IN_PROGRESS, retourne null.
   * - Clé COMPLETED → retourne la réponse stockée.
   * - Clé IN_PROGRESS → conflit.
   * - Clé avec hash différent → conflit.
   * - Clé FAILED → suppression, puis nouvelle tentative.
   */
  async acquire(record: IdempotencyRecord): Promise<StoredResponse | null> {
    const now = new Date();

    // Purge opportuniste des clés expirées
    await this.prisma.idempotencyKey.deleteMany({
      where: { expiresAt: { lt: now } },
    });

    const existing = await this.prisma.idempotencyKey.findUnique({
      where: {
        key_scope: {
          key: record.key,
          scope: record.scope,
        },
      },
    });

    if (existing) {
      /* ----- Hash différent → conflit ----- */
      if (existing.requestHash !== record.requestHash) {
        throw new CatalogError(
          CatalogErrorCode.IDEMPOTENCY_CONFLICT,
          "Cette clé d'idempotence a déjà été utilisée avec un payload différent.",
          409,
        );
      }

      /* ----- Déjà COMPLETED → on retourne la réponse ----- */
      if (existing.status === "COMPLETED") {
        return {
          statusCode: existing.responseStatus ?? 200,
          body: existing.responseBody,
        };
      }

      /* ----- IN_PROGRESS → conflit ----- */
      if (existing.status === "PROCESSING") {
        throw new CatalogError(
          CatalogErrorCode.IDEMPOTENCY_CONFLICT,
          "Une requête identique est déjà en cours de traitement.",
          409,
        );
      }

      /* ----- FAILED → on supprime pour permettre un retry ----- */
      await this.prisma.idempotencyKey.delete({
        where: { id: existing.id },
      });
    }

    /* ----- Création de la clé IN_PROGRESS ----- */
    try {
      await this.prisma.idempotencyKey.create({
        data: {
          key: record.key,
          scope: record.scope,
          userId: record.userId,
          requestHash: record.requestHash,
          status: "PROCESSING",
          expiresAt: new Date(now.getTime() + TTL_MS),
        },
      });
    } catch (error) {
      /* ----- Course concurrente : un autre process a créé la clé ----- */
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        throw new CatalogError(
          CatalogErrorCode.IDEMPOTENCY_CONFLICT,
          "Une requête identique est déjà en cours de traitement.",
          409,
        );
      }
      throw error;
    }

    return null;
  }

  /* ================================================================
   * COMPLETE
   * ================================================================ */

  /**
   * Enregistre la réponse après succès.
   */
  async complete(
    key: string,
    scope: string,
    response: StoredResponse,
  ): Promise<void> {
    await this.prisma.idempotencyKey.update({
      where: {
        key_scope: { key, scope },
      },
      data: {
        status: "COMPLETED",
        responseStatus: response.statusCode,
        responseBody: response.body as Prisma.InputJsonValue,
        completedAt: new Date(),
      },
    });
  }

  /* ================================================================
   * FAIL
   * ================================================================ */

  /**
   * Marque la clé comme échouée pour permettre un retry.
   */
  async fail(key: string, scope: string): Promise<void> {
    await this.prisma.idempotencyKey.updateMany({
      where: { key, scope },
      data: { status: "FAILED" },
    });
  }
}
