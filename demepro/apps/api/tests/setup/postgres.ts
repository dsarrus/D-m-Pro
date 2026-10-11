import { prisma, resetPrismaClient } from "../../src/infrastructure/database/prisma";
import type { PrismaClient } from "../../src/generated/prisma/client";

const TEST_DB_URL =
  process.env.TEST_DATABASE_URL ??
  "postgresql://demepro:demepro@localhost:5432/demepro_test";

let initialized = false;

export async function startPostgres(): Promise<{
  prisma: PrismaClient;
  databaseUrl: string;
}> {
  process.env.DATABASE_URL = TEST_DB_URL;

  if (!initialized) {
    await resetPrismaClient();
    await prisma.$connect();
    initialized = true;
  }

  return { prisma, databaseUrl: TEST_DB_URL };
}

export async function stopPostgres(): Promise<void> {
  // no-op
}