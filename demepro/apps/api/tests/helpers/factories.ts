// apps/api/tests/helpers/factories.ts

import { PrismaClient } from "../../src/generated/prisma/client";

/* ================================================================
 * TRUNCATE
 * ================================================================ */

/**
 * Purge toutes les tables PostgreSQL du schéma public
 * SAUF _prisma_migrations.
 *
 * Retry exponentiel sur deadlock PostgreSQL (40P01) : un deadlock peut
 * survenir quand une notification async (fire-and-forget) est encore
 * en cours d'INSERT pendant qu'on TRUNCATE les mêmes tables.
 */
export async function truncateAll(
  prisma: PrismaClient,
  maxAttempts = 5,
): Promise<void> {
  const result = await prisma.$queryRawUnsafe<Array<{ tablename: string }>>(
    `SELECT tablename
     FROM pg_tables
     WHERE schemaname = 'public'
       AND tablename != '_prisma_migrations'`,
  );

  if (result.length === 0) return;

  const tables = result.map((r) => `"${r.tablename}"`).join(", ");

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      await prisma.$executeRawUnsafe(
        `TRUNCATE TABLE ${tables} RESTART IDENTITY CASCADE;`,
      );
      return;
    } catch (err: unknown) {
      const e = err as { code?: string; meta?: { code?: string } };
      const isDeadlock = e?.code === "P2010" && e?.meta?.code === "40P01";

      if (!isDeadlock || attempt >= maxAttempts) throw err;

      const delay = 100 * 2 ** attempt + Math.random() * 100;
      console.warn(
        `[truncateAll] deadlock detected (attempt ${attempt}/${maxAttempts}), retrying in ${delay.toFixed(0)}ms...`,
      );
      await new Promise((r) => setTimeout(r, delay));
    }
  }
}

/* ================================================================
 * SEED TENANT
 * ================================================================ */

export type SeededTenant = {
  userId: string;
  professionalId: string;
  storeId: string;
  categoryId: string;
  verticalId: string;
};

/**
 * Crée un tenant complet prêt à l'emploi :
 *  - Vertical (upsert — code @unique)
 *  - Category (rattachée à la vertical)
 *  - User (PROFESSIONAL)
 *  - ProfessionalProfile
 *  - Store
 *  - Role PROFESSIONAL + UserRoleAssignment
 *
 * Idempotent pour le Vertical : peut être appelé N fois
 * dans le même test sans conflit.
 */
export async function seedTenant(
  prisma: PrismaClient,
  overrides?: Partial<{
    email: string;
    storeName: string;
    storeSlug: string;
  }>,
): Promise<SeededTenant> {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  const email = overrides?.email ?? `user-${suffix}@test.dev`;

  /* 1. Vertical — upsert car code est @unique */
  const vertical = await prisma.vertical.upsert({
    where: { code: "ARTISANS" },
    update: {},
    create: {
      code: "ARTISANS",
      name: "Artisans",
      slug: `artisans-${suffix}`,
      status: "ACTIVE",
      sortOrder: 0,
    },
  });

  /* 2. Category — slug unique par suffix */
  const category = await prisma.category.create({
    data: {
      verticalId: vertical.id,
      name: "Catégorie Test",
      slug: `categorie-${suffix}`,
      type: "PRODUCT",
      status: "ACTIVE",
      sortOrder: 0,
    },
  });

  /* 3. User */
  const user = await prisma.user.create({
    data: {
     email,
    phone: `+22370${Math.floor(Math.random() * 10000000)}`,
    phoneVerifiedAt: new Date(),  // ⭐ AJOUTER
    passwordHash: "hashed",
    firstName: "Test",
    lastName: "User",
    status: "ACTIVE",
    },
  });

  /* 4. ProfessionalProfile */
  const professional = await prisma.professionalProfile.create({
    data: {
      userId: user.id,
      businessName: "Test SARL",
      slug: `test-sarl-${suffix}`,
      verificationStatus: "VERIFIED",
    },
  });

  /* 5. Store */
  const store = await prisma.store.create({
    data: {
      professionalId: professional.id,
      name: overrides?.storeName ?? "Boutique Test",
      slug: overrides?.storeSlug ?? `boutique-${suffix}`,
      status: "ACTIVE",
    },
  });

  /* 6. Role PROFESSIONAL + assignment */
  await ensureRoleAssigned(prisma, user.id, "PROFESSIONAL");

  return {
    userId: user.id,
    professionalId: professional.id,
    storeId: store.id,
    categoryId: category.id,
    verticalId: vertical.id,
  };
}

/* ================================================================
 * RBAC HELPERS
 * ================================================================ */

/**
 * Crée le rôle s'il n'existe pas, puis l'assigne à l'utilisateur.
 */
export async function ensureRoleAssigned(
  prisma: PrismaClient,
  userId: string,
  roleCode: string,
): Promise<void> {
  let role = await prisma.role.findUnique({
    where: { code: roleCode },
  });

  if (!role) {
    role = await prisma.role.create({
      data: {
        code: roleCode,
        name: roleCode,
        isSystem: true,
      },
    });
  }

  // On ignore si l'assignation existe déjà (idempotent)
  const existing = await prisma.userRoleAssignment.findUnique({
    where: {
      userId_roleId: {
        userId,
        roleId: role.id,
      },
    },
  });

  if (existing) return;

  await prisma.userRoleAssignment.create({
    data: {
      userId,
      roleId: role.id,
    },
  });
}

/* ================================================================
 * SEED PROFESSIONAL SANS STORE
 * ================================================================ */

export type SeededProfessional = {
  userId: string;
  professionalId: string;
  categoryId: string;
  verticalId: string;
};

/**
 * Crée un professional SANS boutique.
 * Utile pour tester le module Store (création de store).
 *
 * Contrairement à `seedTenant`, ne crée pas de Store.
 */
export async function seedProfessionalWithoutStore(
  prisma: PrismaClient,
): Promise<SeededProfessional> {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  /* 1. Vertical — upsert */
  const vertical = await prisma.vertical.upsert({
    where: { code: "ARTISANS" },
    update: {},
    create: {
      code: "ARTISANS",
      name: "Artisans",
      slug: `artisans-${suffix}`,
      status: "ACTIVE",
      sortOrder: 0,
    },
  });

  /* 2. Category */
  const category = await prisma.category.create({
    data: {
      verticalId: vertical.id,
      name: "Catégorie Test",
      slug: `categorie-${suffix}`,
      type: "PRODUCT",
      status: "ACTIVE",
      sortOrder: 0,
    },
  });

  /* 3. User */
  const user = await prisma.user.create({
    data: {
      email: `user-${suffix}@test.dev`,
    phone: `+22370${Math.floor(Math.random() * 10000000)}`,
    phoneVerifiedAt: new Date(),  // ⭐ AJOUTER
    passwordHash: "hashed",
    firstName: "Test",
    lastName: "User",
    status: "ACTIVE",
    },
  });

  /* 4. ProfessionalProfile — VERIFIED par défaut */
  const professional = await prisma.professionalProfile.create({
    data: {
      userId: user.id,
      businessName: "Test SARL",
      slug: `test-sarl-${suffix}`,
      verificationStatus: "VERIFIED",
    },
  });

  /* 5. Rôle PROFESSIONAL */
  await ensureRoleAssigned(prisma, user.id, "PROFESSIONAL");

  return {
    userId: user.id,
    professionalId: professional.id,
    categoryId: category.id,
    verticalId: vertical.id,
  };
}

/**
 * Crée un professional avec un statut KYC personnalisé.
 * Utile pour tester le refus d'activation.
 */
export async function seedProfessionalWithVerification(
  prisma: PrismaClient,
  verificationStatus:
    | "UNVERIFIED"
    | "PENDING"
    | "VERIFIED"
    | "REJECTED"
    | "EXPIRED",
): Promise<SeededProfessional> {
  const result = await seedProfessionalWithoutStore(prisma);

  await prisma.professionalProfile.update({
    where: { id: result.professionalId },
    data: { verificationStatus },
  });

  return result;
}

/**
 * Crée un utilisateur avec le rôle ADMIN.
 * Utile pour tester les endpoints admin.
 */
export async function seedAdmin(prisma: PrismaClient): Promise<{
  userId: string;
}> {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  const user = await prisma.user.create({
    data: {
      email: `admin-${suffix}@test.dev`,
      passwordHash: "hashed",
      firstName: "Admin",
      lastName: "User",
      status: "ACTIVE",
    },
  });

  await ensureRoleAssigned(prisma, user.id, "ADMIN");

  return { userId: user.id };
}
