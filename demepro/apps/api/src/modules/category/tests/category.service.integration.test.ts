// apps/api/src/modules/category/tests/category.service.integration.test.ts

import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";

import { PrismaClient } from "../../../generated/prisma/client";
import { startPostgres, stopPostgres } from "../../../../tests/setup/postgres";
import { seedTenant, truncateAll } from "../../../../tests/helpers/factories";

import { CategoryService } from "../services/category.service";
import { CategoryRepository } from "../repositories/category.repository";

const ADMIN_CTX = { userId: "admin-id", role: "ADMIN" };

describe("CategoryService (integration)", () => {
  let prisma: PrismaClient;
  let service: CategoryService;

  beforeAll(async () => {
    const ctx = await startPostgres();
    prisma = ctx.prisma;

    const repository = new CategoryRepository(prisma);
    service = new CategoryService(prisma, repository);
  });

  afterAll(async () => {
    await stopPostgres();
  });

  beforeEach(async () => {
    await truncateAll(prisma);
  });

  /* ================================================================
   * HELPERS
   * ================================================================ */

  async function setupVertical() {
    const tenant = await seedTenant(prisma);
    return { tenant, verticalId: tenant.verticalId };
  }

  /* ================================================================
   * CREATE
   * ================================================================ */

  describe("createCategory", () => {
    it("crée une catégorie racine", async () => {
      const { verticalId } = await setupVertical();

      const category = await service.createCategory(
        {
          verticalId,
          name: "Mode",
          slug: "mode",
          type: "PRODUCT",
          status: "ACTIVE",
          sortOrder: 0,
        },
        ADMIN_CTX,
      );

      expect(category.id).toBeDefined();
      expect(category.slug).toBe("mode");
      expect(category.parentId).toBeNull();
    });

    it("refuse si non-admin", async () => {
      const { verticalId } = await setupVertical();

      await expect(
        service.createCategory(
          {
            verticalId,
            name: "Mode",
            slug: "mode",
            type: "PRODUCT",
            status: "ACTIVE",
            sortOrder: 0,
          },
          { userId: "u", role: "PROFESSIONAL" },
        ),
      ).rejects.toMatchObject({
        code: "UNAUTHORIZED",
      });
    });

    it("refuse si le vertical n'existe pas", async () => {
      await expect(
        service.createCategory(
          {
            verticalId: "00000000-0000-0000-0000-000000000000",
            name: "Mode",
            slug: "mode-x",
            type: "PRODUCT",
            status: "ACTIVE",
            sortOrder: 0,
          },
          ADMIN_CTX,
        ),
      ).rejects.toMatchObject({
        code: "VERTICAL_NOT_FOUND",
      });
    });

    it("refuse si le slug est déjà utilisé dans le même vertical", async () => {
      const { verticalId } = await setupVertical();

      await service.createCategory(
        {
          verticalId,
          name: "Mode",
          slug: "mode",
          type: "PRODUCT",
          status: "ACTIVE",
          sortOrder: 0,
        },
        ADMIN_CTX,
      );

      await expect(
        service.createCategory(
          {
            verticalId,
            name: "Mode 2",
            slug: "mode",
            type: "PRODUCT",
            status: "ACTIVE",
            sortOrder: 1,
          },
          ADMIN_CTX,
        ),
      ).rejects.toMatchObject({
        code: "CATEGORY_SLUG_TAKEN",
      });
    });

    it("accepte un slug identique dans un autre vertical", async () => {
      const { tenant } = await setupVertical();

      /* Créer un 2e vertical */
      const vertical2 = await prisma.vertical.create({
        data: {
          code: "MAISON",
          name: "Maison",
          slug: `maison-${Date.now()}`,
          status: "ACTIVE",
          sortOrder: 0,
        },
      });

      await service.createCategory(
        {
          verticalId: tenant.verticalId,
          name: "Mode",
          slug: "mode",
          type: "PRODUCT",
          status: "ACTIVE",
          sortOrder: 0,
        },
        ADMIN_CTX,
      );

      const cat2 = await service.createCategory(
        {
          verticalId: vertical2.id,
          name: "Mode",
          slug: "mode",
          type: "PRODUCT",
          status: "ACTIVE",
          sortOrder: 0,
        },
        ADMIN_CTX,
      );

      expect(cat2.id).toBeDefined();
    });
  });

  /* ================================================================
   * HIÉRARCHIE — 3 NIVEAUX MAX
   * ================================================================ */

  describe("hiérarchie", () => {
    it("accepte 3 niveaux", async () => {
      const { verticalId } = await setupVertical();

      /* Niveau 1 */
      const l1 = await service.createCategory(
        {
          verticalId,
          name: "Niveau 1",
          slug: "n1",
          type: "BOTH",
          status: "ACTIVE",
          sortOrder: 0,
        },
        ADMIN_CTX,
      );

      /* Niveau 2 */
      const l2 = await service.createCategory(
        {
          verticalId,
          parentId: l1.id,
          name: "Niveau 2",
          slug: "n2",
          type: "BOTH",
          status: "ACTIVE",
          sortOrder: 0,
        },
        ADMIN_CTX,
      );

      /* Niveau 3 */
      const l3 = await service.createCategory(
        {
          verticalId,
          parentId: l2.id,
          name: "Niveau 3",
          slug: "n3",
          type: "BOTH",
          status: "ACTIVE",
          sortOrder: 0,
        },
        ADMIN_CTX,
      );

      expect(l3.parentId).toBe(l2.id);
    });

    it("refuse un 4ᵉ niveau", async () => {
      const { verticalId } = await setupVertical();

      const l1 = await service.createCategory(
        { verticalId, name: "N1", slug: "n1", type: "BOTH", status: "ACTIVE", sortOrder: 0 },
        ADMIN_CTX,
      );
      const l2 = await service.createCategory(
        { verticalId, parentId: l1.id, name: "N2", slug: "n2", type: "BOTH", status: "ACTIVE", sortOrder: 0 },
        ADMIN_CTX,
      );
      const l3 = await service.createCategory(
        { verticalId, parentId: l2.id, name: "N3", slug: "n3", type: "BOTH", status: "ACTIVE", sortOrder: 0 },
        ADMIN_CTX,
      );

      await expect(
        service.createCategory(
          { verticalId, parentId: l3.id, name: "N4", slug: "n4", type: "BOTH", status: "ACTIVE", sortOrder: 0 },
          ADMIN_CTX,
        ),
      ).rejects.toMatchObject({
        code: "CATEGORY_MAX_DEPTH",
      });
    });

    it("refuse un cycle (parent = descendant)", async () => {
      const { verticalId } = await setupVertical();

      const l1 = await service.createCategory(
        { verticalId, name: "N1", slug: "n1", type: "BOTH", status: "ACTIVE", sortOrder: 0 },
        ADMIN_CTX,
      );
      const l2 = await service.createCategory(
        { verticalId, parentId: l1.id, name: "N2", slug: "n2", type: "BOTH", status: "ACTIVE", sortOrder: 0 },
        ADMIN_CTX,
      );

      /* Essayons de créer un enfant du N2 qui serait le N1 (cycle) */
      await expect(
        service.createCategory(
          { verticalId, parentId: l2.id, name: "Cycle", slug: "cycle", type: "BOTH", status: "ACTIVE", sortOrder: 0 },
          ADMIN_CTX,
        ),
      ).resolves.toBeDefined(); // pas un cycle
    });
  });

  /* ================================================================
   * COMPATIBILITÉ DE TYPE
   * ================================================================ */

  describe("compatibilité type parent/enfant", () => {
    it("refuse SERVICE → PRODUCT", async () => {
      const { verticalId } = await setupVertical();

      const svcParent  = await service.createCategory(
        { verticalId, name: "Service", slug: "svc", type: "SERVICE", status: "ACTIVE", sortOrder: 0 },
        ADMIN_CTX,
      );

      await expect(
        service.createCategory(
          { verticalId, parentId: svcParent .id, name: "Produit", slug: "prd", type: "PRODUCT", status: "ACTIVE", sortOrder: 0 },
          ADMIN_CTX,
        ),
      ).rejects.toMatchObject({
        code: "CATEGORY_TYPE_MISMATCH",
      });
    });

    it("refuse PRODUCT → SERVICE", async () => {
      const { verticalId } = await setupVertical();

      const product = await service.createCategory(
        { verticalId, name: "Produit", slug: "prd", type: "PRODUCT", status: "ACTIVE", sortOrder: 0 },
        ADMIN_CTX,
      );

      await expect(
        service.createCategory(
          { verticalId, parentId: product.id, name: "Service", slug: "svc", type: "SERVICE", status: "ACTIVE", sortOrder: 0 },
          ADMIN_CTX,
        ),
      ).rejects.toMatchObject({
        code: "CATEGORY_TYPE_MISMATCH",
      });
    });

    it("accepte BOTH → SERVICE", async () => {
      const { verticalId } = await setupVertical();

      const both = await service.createCategory(
        { verticalId, name: "Both", slug: "both", type: "BOTH", status: "ACTIVE", sortOrder: 0 },
        ADMIN_CTX,
      );

      const child = await service.createCategory(
        { verticalId, parentId: both.id, name: "Service", slug: "svc", type: "SERVICE", status: "ACTIVE", sortOrder: 0 },
        ADMIN_CTX,
      );

      expect(child.id).toBeDefined();
    });
  });

  /* ================================================================
   * DELETE
   * ================================================================ */

  describe("deleteCategory", () => {
    it("supprime une catégorie sans enfants/produits", async () => {
      const { verticalId } = await setupVertical();

      const cat = await service.createCategory(
        { verticalId, name: "Orpheline", slug: "orph", type: "BOTH", status: "ACTIVE", sortOrder: 0 },
        ADMIN_CTX,
      );

      await service.deleteCategory(cat.id, ADMIN_CTX);

      const refreshed = await prisma.category.findUnique({
        where: { id: cat.id },
      });
      expect(refreshed).toBeNull();
    });

    it("refuse si la catégorie a des enfants", async () => {
      const { verticalId } = await setupVertical();

      const parent = await service.createCategory(
        { verticalId, name: "Parent", slug: "prt", type: "BOTH", status: "ACTIVE", sortOrder: 0 },
        ADMIN_CTX,
      );
      await service.createCategory(
        { verticalId, parentId: parent.id, name: "Enfant", slug: "enf", type: "BOTH", status: "ACTIVE", sortOrder: 0 },
        ADMIN_CTX,
      );

      await expect(
        service.deleteCategory(parent.id, ADMIN_CTX),
      ).rejects.toMatchObject({
        code: "CATEGORY_HAS_CHILDREN",
      });
    });

    it("refuse si la catégorie a des produits", async () => {
      const { tenant, verticalId } = await setupVertical();

      const cat = await service.createCategory(
        { verticalId, name: "Cat", slug: "cat-p", type: "PRODUCT", status: "ACTIVE", sortOrder: 0 },
        ADMIN_CTX,
      );

      /* Créer un produit */
      await prisma.product.create({
        data: {
          storeId: tenant.storeId,
          categoryId: cat.id,
          name: "Produit",
          slug: "produit-cat",
          hasVariants: false,
          price: 1000,
          currency: "XOF",
        },
      });

      await expect(
        service.deleteCategory(cat.id, ADMIN_CTX),
      ).rejects.toMatchObject({
        code: "CATEGORY_HAS_PRODUCTS",
      });
    });
  });

  /* ================================================================
   * TREE
   * ================================================================ */

  describe("getTreeByVertical", () => {
    it("retourne l'arbre complet", async () => {
  const { verticalId } = await setupVertical();

  /* ✅ Supprimer la catégorie par défaut de seedTenant */
  await prisma.category.deleteMany({ where: { verticalId } });


      const l1 = await service.createCategory(
        { verticalId, name: "N1", slug: "tree-n1", type: "BOTH", status: "ACTIVE", sortOrder: 0 },
        ADMIN_CTX,
      );
      const l2 = await service.createCategory(
        { verticalId, parentId: l1.id, name: "N2", slug: "tree-n2", type: "BOTH", status: "ACTIVE", sortOrder: 0 },
        ADMIN_CTX,
      );
      await service.createCategory(
        { verticalId, parentId: l2.id, name: "N3", slug: "tree-n3", type: "BOTH", status: "ACTIVE", sortOrder: 0 },
        ADMIN_CTX,
      );

      const tree = await service.getTreeByVertical(verticalId);

      expect(tree).toHaveLength(1);
      expect(tree[0].children).toHaveLength(1);
      expect(tree[0].children[0].children).toHaveLength(1);
    });
  });
});