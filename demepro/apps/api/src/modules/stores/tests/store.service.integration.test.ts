// apps/api/src/modules/stores/tests/store.service.integration.test.ts

import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";

import { PrismaClient } from "../../../generated/prisma/client";
import { startPostgres, stopPostgres } from "../../../../tests/setup/postgres";
import { seedProfessionalWithoutStore,
  seedProfessionalWithVerification,
  seedAdmin,seedTenant, truncateAll } from "../../../../tests/helpers/factories";

import { StoreService } from "../services/store.service";
import { StoreRepository } from "../repositories/store.repository";
import { StoreError } from "../errors/store-error";

describe("StoreService (integration)", () => {
  let prisma: PrismaClient;
  let service: StoreService;

  beforeAll(async () => {
    const ctx = await startPostgres();
    prisma = ctx.prisma;

    const repository = new StoreRepository(prisma);
    service = new StoreService(prisma, repository);
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

  async function setupProfessional() {
    return seedProfessionalWithoutStore(prisma);
  }

  async function markVerified(professionalId: string) {
    await prisma.professionalProfile.update({
      where: { id: professionalId },
      data: { verificationStatus: "VERIFIED" },
    });
  }

  /* ================================================================
   * CREATE
   * ================================================================ */

  describe("createStore", () => {
    it("crée une boutique en DRAFT", async () => {
      const tenant = await setupProfessional();

      const store = await service.createStore(
        {
          name: "Ma boutique",
          slug: "ma-boutique",
          description: "Description",
        },
        { userId: tenant.userId },
      );

      expect(store.id).toBeDefined();
      expect(store.name).toBe("Ma boutique");
      expect(store.slug).toBe("ma-boutique");
      expect(store.status).toBe("DRAFT");
      expect(store.professionalId).toBe(tenant.professionalId);
    });

    it("refuse si l'utilisateur n'a pas de profil pro", async () => {
      /* Créer un user sans profil pro */
      const user = await prisma.user.create({
        data: {
          email: `no-pro-${Date.now()}@test.dev`,
          passwordHash: "hash",
          firstName: "No",
          lastName: "Pro",
          status: "ACTIVE",
        },
      });

      await expect(
        service.createStore(
          { name: "Boutique", slug: "boutique-x" },
          { userId: user.id },
        ),
      ).rejects.toMatchObject({
        code: "PROFESSIONAL_NOT_FOUND",
      });
    });

    it("refuse si le pro a déjà une boutique", async () => {
      const tenant = await setupProfessional();

      await service.createStore(
        { name: "Boutique 1", slug: "boutique-1" },
        { userId: tenant.userId },
      );

      await expect(
        service.createStore(
          { name: "Boutique 2", slug: "boutique-2" },
          { userId: tenant.userId },
        ),
      ).rejects.toMatchObject({
        code: "STORE_ALREADY_EXISTS",
      });
    });

    it("refuse si le slug est déjà utilisé globalement", async () => {
      const tenantA = await setupProfessional();
      const tenantB = await setupProfessional();

      await service.createStore(
        { name: "Boutique A", slug: "slug-commun" },
        { userId: tenantA.userId },
      );

      await expect(
        service.createStore(
          { name: "Boutique B", slug: "slug-commun" },
          { userId: tenantB.userId },
        ),
      ).rejects.toMatchObject({
        code: "STORE_SLUG_TAKEN",
      });
    });

    it("accepte les coordonnées GPS", async () => {
      const tenant = await setupProfessional();

      const store = await service.createStore(
        {
          name: "Boutique",
          slug: "boutique-gps",
          latitude: 12.6392,
          longitude: -8.0029,
        },
        { userId: tenant.userId },
      );

      expect(store.latitude?.toString()).toBe("12.6392");
      expect(store.longitude?.toString()).toBe("-8.0029");
    });
  });

  /* ================================================================
   * GET
   * ================================================================ */

  describe("getMyStore", () => {
    it("retourne la boutique du pro", async () => {
      const tenant = await setupProfessional();

      await service.createStore(
        { name: "Ma boutique", slug: "ma-boutique" },
        { userId: tenant.userId },
      );

      const store = await service.getMyStore({ userId: tenant.userId });

      expect(store.name).toBe("Ma boutique");
    });

    it("lance STORE_NOT_FOUND si aucune boutique", async () => {
      const tenant = await setupProfessional();

      await expect(
        service.getMyStore({ userId: tenant.userId }),
      ).rejects.toMatchObject({
        code: "STORE_NOT_FOUND",
      });
    });
  });

  describe("getPublicBySlug", () => {
    it("retourne une boutique ACTIVE", async () => {
      const tenant = await setupProfessional();
      await markVerified(tenant.professionalId);

      await service.createStore(
        { name: "Pub", slug: "pub-store" },
        { userId: tenant.userId },
      );

      const myStore = await service.getMyStore({ userId: tenant.userId });
      await service.activateStore(myStore.id, { userId: tenant.userId });

      const pub = await service.getPublicBySlug("pub-store");
      expect(pub.slug).toBe("pub-store");
      expect(pub.status).toBe("ACTIVE");
    });

    it("refuse si la boutique est en DRAFT", async () => {
      const tenant = await setupProfessional();

      await service.createStore(
        { name: "Draft", slug: "draft-store" },
        { userId: tenant.userId },
      );

      await expect(
        service.getPublicBySlug("draft-store"),
      ).rejects.toMatchObject({
        code: "STORE_NOT_FOUND",
      });
    });
  });

  /* ================================================================
   * UPDATE
   * ================================================================ */

  describe("updateStore", () => {
    it("met à jour le nom et la description", async () => {
      const tenant = await setupProfessional();

      const store = await service.createStore(
        { name: "Nom 1", slug: "store-upd" },
        { userId: tenant.userId },
      );

      const updated = await service.updateStore(
        store.id,
        { name: "Nom 2", description: "Desc" },
        { userId: tenant.userId },
      );

      expect(updated.name).toBe("Nom 2");
      expect(updated.description).toBe("Desc");
    });

    it("refuse si non-propriétaire", async () => {
      const tenantA = await setupProfessional();
      const tenantB = await setupProfessional();

      const store = await service.createStore(
        { name: "Store A", slug: "store-a" },
        { userId: tenantA.userId },
      );

      await expect(
        service.updateStore(
          store.id,
          { name: "Hack" },
          { userId: tenantB.userId },
        ),
      ).rejects.toMatchObject({
        code: "UNAUTHORIZED_STORE",
      });
    });

    it("refuse de changer le slug pour un slug pris", async () => {
      const tenantA = await setupProfessional();
      const tenantB = await setupProfessional();

      await service.createStore(
        { name: "Store A", slug: "store-a" },
        { userId: tenantA.userId },
      );

      const storeB = await service.createStore(
        { name: "Store B", slug: "store-b" },
        { userId: tenantB.userId },
      );

      await expect(
        service.updateStore(
          storeB.id,
          { slug: "store-a" },
          { userId: tenantB.userId },
        ),
      ).rejects.toMatchObject({
        code: "STORE_SLUG_TAKEN",
      });
    });
  });

  /* ================================================================
   * ACTIVATE
   * ================================================================ */

  describe("activateStore", () => {
  it("active une boutique si le téléphone est confirmé (Niveau 1)", async () => {
    const tenant = await setupProfessional();

    /* Confirmer le téléphone */
    await prisma.user.update({
      where: { id: tenant.userId },
      data: { phoneVerifiedAt: new Date() },
    });

    const store = await service.createStore(
      { name: "S", slug: "activate-ok" },
      { userId: tenant.userId },
    );

    const activated = await service.activateStore(store.id, {
      userId: tenant.userId,
    });

    expect(activated.status).toBe("ACTIVE");
  });

  it("refuse si le téléphone n'est pas confirmé", async () => {
  const tenant = await setupProfessional();

  /* ✅ Retirer la confirmation du téléphone */
  await prisma.user.update({
    where: { id: tenant.userId },
    data: { phoneVerifiedAt: null },
  });

  const store = await service.createStore(
    { name: "S", slug: "activate-ko" },
    { userId: tenant.userId },
  );

  await expect(
    service.activateStore(store.id, { userId: tenant.userId }),
  ).rejects.toMatchObject({
    code: "PROFESSIONAL_NOT_VERIFIED",
  });
});
});

  /* ================================================================
   * SUSPEND (admin)
   * ================================================================ */

  describe("suspendStore", () => {
    it("suspend une boutique ACTIVE", async () => {
      const tenant = await setupProfessional();
      await markVerified(tenant.professionalId);

      const store = await service.createStore(
        { name: "S", slug: "suspend-ok" },
        { userId: tenant.userId },
      );

      await service.activateStore(store.id, { userId: tenant.userId });

      const suspended = await service.suspendStore(store.id, {
        userId: "admin-id",
        role: "ADMIN",
      });

      expect(suspended.status).toBe("SUSPENDED");
    });

    it("refuse si l'utilisateur n'est pas admin", async () => {
      const tenant = await setupProfessional();
      await markVerified(tenant.professionalId);

      const store = await service.createStore(
        { name: "S", slug: "suspend-ko" },
        { userId: tenant.userId },
      );

      await service.activateStore(store.id, { userId: tenant.userId });

      await expect(
        service.suspendStore(store.id, {
          userId: tenant.userId,
          role: "PROFESSIONAL",
        }),
      ).rejects.toMatchObject({
        code: "UNAUTHORIZED",
      });
    });
  });

  /* ================================================================
   * CLOSE
   * ================================================================ */

  describe("closeStore", () => {
    it("ferme une boutique sans produits", async () => {
      const tenant = await setupProfessional();

      const store = await service.createStore(
        { name: "S", slug: "close-ok" },
        { userId: tenant.userId },
      );

      const closed = await service.closeStore(store.id, {
        userId: tenant.userId,
      });

      expect(closed.status).toBe("CLOSED");
    });

    it("refuse si des produits existent", async () => {
      const tenant = await setupProfessional();

      const store = await service.createStore(
        { name: "S", slug: "close-ko" },
        { userId: tenant.userId },
      );

      /* Créer un produit */
      await prisma.product.create({
        data: {
          storeId: store.id,
          categoryId: tenant.categoryId,
          name: "Produit",
          slug: "produit-x",
          hasVariants: false,
          price: 1000,
          currency: "XOF",
        },
      });

      await expect(
        service.closeStore(store.id, { userId: tenant.userId }),
      ).rejects.toMatchObject({
        code: "STORE_HAS_PRODUCTS",
      });
    });
  });

  /* ================================================================
   * LIST
   * ================================================================ */

  describe("listActive", () => {
    it("retourne uniquement les boutiques ACTIVE", async () => {
      const tenantA = await setupProfessional();
      const tenantB = await setupProfessional();
      await markVerified(tenantA.professionalId);

      const storeA = await service.createStore(
        { name: "A", slug: "list-a" },
        { userId: tenantA.userId },
      );
      await service.activateStore(storeA.id, { userId: tenantA.userId });

      await service.createStore(
        { name: "B", slug: "list-b" },
        { userId: tenantB.userId },
      );

      const result = await service.listActive();

      expect(result.data).toHaveLength(1);
      expect(result.data[0].slug).toBe("list-a");
    });
  });
});