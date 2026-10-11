// Seed script
import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../apps/api/src/generated/prisma/client";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});

const prisma = new PrismaClient({
  adapter,
});

const roles = [
  {
    code: "CUSTOMER",
    name: "Client",
    description: "Utilisateur recherchant des produits ou services",
    isSystem: true,
  },
  {
    code: "PROFESSIONAL",
    name: "Professionnel",
    description: "Professionnel proposant des services ou produits",
    isSystem: true,
  },
  {
    code: "ADMIN",
    name: "Administrateur",
    description: "Administrateur de la plateforme",
    isSystem: true,
  },
  {
    code: "MODERATOR",
    name: "Modérateur",
    description: "Modérateur de la plateforme",
    isSystem: true,
  },
  {
    code: "SUPPORT",
    name: "Support",
    description: "Support client",
    isSystem: true,
  },
];

const permissions = [
  ["user:read", "Consulter les utilisateurs"],
  ["user:update", "Modifier les utilisateurs"],

  ["professional:read", "Consulter les professionnels"],
  ["professional:update", "Modifier les professionnels"],

  ["service:create", "Créer un service"],
  ["service:update", "Modifier un service"],
  ["service:delete", "Supprimer un service"],

  ["product:create", "Créer un produit"],
  ["product:update", "Modifier un produit"],
  ["product:delete", "Supprimer un produit"],

  ["order:read", "Consulter les commandes"],
  ["order:update", "Modifier une commande"],

  ["admin:access", "Accéder à l'administration"],
];

async function main() {
  for (const role of roles) {
    await prisma.role.upsert({
      where: {
        code: role.code,
      },
      update: role,
      create: role,
    });
  }

  for (const [code, description] of permissions) {
    await prisma.permission.upsert({
      where: {
        code,
      },
      update: {
        description,
      },
      create: {
        code,
        description,
      },
    });
  }

  const customer = await prisma.role.findUniqueOrThrow({
    where: { code: "CUSTOMER" },
  });

  const professional = await prisma.role.findUniqueOrThrow({
    where: { code: "PROFESSIONAL" },
  });

  const admin = await prisma.role.findUniqueOrThrow({
    where: { code: "ADMIN" },
  });

  const permissionMap = Object.fromEntries(await prisma.permission.findMany());

  const assignments = [
    {
      roleId: customer.id,
      permissions: ["user:read"],
    },
    {
      roleId: professional.id,
      permissions: [
        "user:read",
        "professional:read",
        "professional:update",
        "service:create",
        "service:update",
        "service:delete",
        "product:create",
        "product:update",
        "product:delete",
        "order:read",
      ],
    },
    {
      roleId: admin.id,
      permissions: Object.keys(permissionMap),
    },
  ];

  for (const assignment of assignments) {
    for (const permissionCode of assignment.permissions) {
      const permission = permissionMap[permissionCode];

      if (!permission) continue;

      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: assignment.roleId,
            permissionId: permission.id,
          },
        },
        update: {},
        create: {
          roleId: assignment.roleId,
          permissionId: permission.id,
        },
      });
    }
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
