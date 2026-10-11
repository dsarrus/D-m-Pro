// apps/api/tests/helpers/factories.ts

import { PrismaClient } from "../../src/generated/prisma/client";

/* ================================================================
 * TRUNCATE
 * ================================================================ */

/**
 * Purge toutes les tables PostgreSQL du schéma public
 * SAUF _prisma_migrations.
 */
export async function truncateAll(prisma: PrismaClient): Promise<void> {
  const result = await prisma.$queryRawUnsafe<Array<{ tablename: string }>>(
    `SELECT tablename
     FROM pg_tables
     WHERE schemaname = 'public'
       AND tablename != '_prisma_migrations'`,
  );

  if (result.length === 0) return;

  const tables = result.map((r) => `"${r.tablename}"`).join(", ");

  await prisma.$executeRawUnsafe(
    `TRUNCATE TABLE ${tables} RESTART IDENTITY CASCADE;`,
  );
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
