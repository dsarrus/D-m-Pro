// apps/api/src/infrastructure/database/prisma.ts

import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../generated/prisma/client";

/* ================================================================
 * LAZY SINGLETON
 * ================================================================ */

let _prisma: PrismaClient | null = null;

function createPrismaClient(): PrismaClient {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error("La variable DATABASE_URL est obligatoire.");
  }

  const adapter = new PrismaPg({
    connectionString: databaseUrl,
  });

  return new PrismaClient({ adapter });
}

/**
 * Proxy paresseux autour de PrismaClient.
 *
 * La validation de DATABASE_URL et l'instanciation de l'adapter
 * sont différées à la première utilisation. Cela permet aux
 * tests E2E de démarrer Testcontainers AVANT que le client
 * ne soit créé.
 *
 * Toutes les méthodes (query, $transaction, $connect, etc.)
 * sont accessibles normalement.
 */
export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop, receiver) {
    if (!_prisma) {
      _prisma = createPrismaClient();
    }

    const value = Reflect.get(_prisma, prop, receiver);

    /* Lier les méthodes pour préserver `this` */
    return typeof value === "function" ? value.bind(_prisma) : value;
  },

  /**
   * Piège pour `Object.keys`, `in`, etc.
   * Nécessaire pour que Prisma détecte correctement
   * les propriétés lors de ses vérifications internes.
   */
  has(_target, prop) {
    if (!_prisma) {
      _prisma = createPrismaClient();
    }
    return Reflect.has(_prisma, prop);
  },

  /**
   * Piège pour `Object.getOwnPropertyDescriptor`.
   */
  getOwnPropertyDescriptor(_target, prop) {
    if (!_prisma) {
      _prisma = createPrismaClient();
    }
    return Reflect.getOwnPropertyDescriptor(_prisma, prop);
  },
});

/* ================================================================
 * HELPERS POUR LES TESTS
 * ================================================================ */

/**
 * Réinitialise le client (utile en test après redéfinition de DATABASE_URL).
 */
export async function resetPrismaClient(): Promise<void> {
  if (_prisma) {
    await _prisma.$disconnect();
    _prisma = null;
  }
}

/**
 * Retourne le client concret (utile pour `$disconnect` en teardown).
 */
export function getPrismaClient(): PrismaClient {
  if (!_prisma) {
    _prisma = createPrismaClient();
  }
  return _prisma;
}