// apps/api/src/modules/address/tests/address.service.integration.test.ts

import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";

import { PrismaClient } from "../../../generated/prisma/client";
import { startPostgres, stopPostgres } from "../../../../tests/setup/postgres";
import { seedTenant, truncateAll } from "../../../../tests/helpers/factories";

import { AddressService } from "../services/address.service";
import { AddressRepository } from "../repositories/address.repository";

describe("AddressService (integration)", () => {
  let prisma: PrismaClient;
  let service: AddressService;

  beforeAll(async () => {
    const ctx = await startPostgres();
    prisma = ctx.prisma;

    const repository = new AddressRepository(prisma);
    service = new AddressService(prisma, repository);
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

  function buildAddressPayload(overrides?: {
    label?: string;
    city?: string;
    isDefault?: boolean;
  }) {
    return {
      label: overrides?.label ?? "Maison",
      type: "HOME" as const,
      recipientName: "Awa Traoré",
      phone: "+22370123456",
      addressLine1: "Hamdallaye ACI 2000",
      addressLine2: null,
      city: overrides?.city ?? "Bamako",
      region: "Bamako",
      countryCode: "ML",
      latitude: null,
      longitude: null,
      isDefault: overrides?.isDefault ?? false,
    };
  }

  /* ================================================================
   * CREATE
   * ================================================================ */

  describe("createAddress", () => {
    it("crée une adresse", async () => {
      const tenant = await seedTenant(prisma);

      const address = await service.createAddress(
        buildAddressPayload(),
        { userId: tenant.userId },
      );

      expect(address.id).toBeDefined();
      expect(address.label).toBe("Maison");
      expect(address.userId).toBe(tenant.userId);
    });

    it("la première adresse devient automatiquement par défaut", async () => {
      const tenant = await seedTenant(prisma);

      const address = await service.createAddress(
        buildAddressPayload({ isDefault: false }),
        { userId: tenant.userId },
      );

      expect(address.isDefault).toBe(true);
    });

    it("une 2ᵉ adresse avec isDefault=true démarque la 1ère", async () => {
      const tenant = await seedTenant(prisma);

      const first = await service.createAddress(
        buildAddressPayload({ label: "1ère" }),
        { userId: tenant.userId },
      );

      const second = await service.createAddress(
        buildAddressPayload({ label: "2ᵉ", isDefault: true }),
        { userId: tenant.userId },
      );

      const refreshedFirst = await prisma.address.findUnique({
        where: { id: first.id },
      });

      expect(second.isDefault).toBe(true);
      expect(refreshedFirst!.isDefault).toBe(false);
    });
  });

  /* ================================================================
   * LIST
   * ================================================================ */

  describe("listMyAddresses", () => {
    it("retourne les adresses triées par défaut puis date", async () => {
      const tenant = await seedTenant(prisma);

      await service.createAddress(
        buildAddressPayload({ label: "1ère" }),
        { userId: tenant.userId },
      );

      await service.createAddress(
        buildAddressPayload({ label: "2ᵉ", isDefault: true }),
        { userId: tenant.userId },
      );

      const list = await service.listMyAddresses({
        userId: tenant.userId,
      });

      expect(list).toHaveLength(2);
      expect(list[0].isDefault).toBe(true);
    });
  });

  /* ================================================================
   * UPDATE
   * ================================================================ */

  describe("updateAddress", () => {
    it("met à jour les champs", async () => {
      const tenant = await seedTenant(prisma);

      const address = await service.createAddress(
        buildAddressPayload(),
        { userId: tenant.userId },
      );

      const updated = await service.updateAddress(
        address.id,
        { label: "Bureau", city: "Ségou" },
        { userId: tenant.userId },
      );

      expect(updated.label).toBe("Bureau");
      expect(updated.city).toBe("Ségou");
    });

    it("refuse si non-propriétaire", async () => {
      const tenantA = await seedTenant(prisma);
      const tenantB = await seedTenant(prisma);

      const address = await service.createAddress(
        buildAddressPayload(),
        { userId: tenantA.userId },
      );

      await expect(
        service.updateAddress(
          address.id,
          { label: "Hack" },
          { userId: tenantB.userId },
        ),
      ).rejects.toMatchObject({
        code: "UNAUTHORIZED_ADDRESS",
      });
    });

    it("refuse de retirer le statut défaut s'il n'y a pas d'autre adresse", async () => {
      const tenant = await seedTenant(prisma);

      const address = await service.createAddress(
        buildAddressPayload(),
        { userId: tenant.userId },
      );

      await expect(
        service.updateAddress(
          address.id,
          { isDefault: false },
          { userId: tenant.userId },
        ),
      ).rejects.toMatchObject({
        code: "ADDRESS_IS_DEFAULT",
      });
    });
  });

  /* ================================================================
   * SET DEFAULT
   * ================================================================ */

  describe("setDefaultAddress", () => {
    it("promouvoit une adresse au rang de défaut", async () => {
      const tenant = await seedTenant(prisma);

      const first = await service.createAddress(
        buildAddressPayload({ label: "1ère" }),
        { userId: tenant.userId },
      );

      const second = await service.createAddress(
        buildAddressPayload({ label: "2ᵉ" }),
        { userId: tenant.userId },
      );

      expect(first.isDefault).toBe(true);

      const promoted = await service.setDefaultAddress(second.id, {
        userId: tenant.userId,
      });

      expect(promoted.isDefault).toBe(true);

      const refreshedFirst = await prisma.address.findUnique({
        where: { id: first.id },
      });
      expect(refreshedFirst!.isDefault).toBe(false);
    });
  });

  /* ================================================================
   * DELETE
   * ================================================================ */

  describe("deleteAddress", () => {
    it("supprime une adresse non-défaut", async () => {
      const tenant = await seedTenant(prisma);

      const first = await service.createAddress(
        buildAddressPayload({ label: "1ère" }),
        { userId: tenant.userId },
      );

      const second = await service.createAddress(
        buildAddressPayload({ label: "2ᵉ" }),
        { userId: tenant.userId },
      );

      await service.deleteAddress(second.id, { userId: tenant.userId });

      const remaining = await prisma.address.findMany({
        where: { userId: tenant.userId },
      });
      expect(remaining).toHaveLength(1);
      expect(remaining[0].id).toBe(first.id);
    });

    it("supprime la défaut et promeut la suivante", async () => {
      const tenant = await seedTenant(prisma);

      const first = await service.createAddress(
        buildAddressPayload({ label: "1ère" }),
        { userId: tenant.userId },
      );

      const second = await service.createAddress(
        buildAddressPayload({ label: "2ᵉ" }),
        { userId: tenant.userId },
      );

      await service.deleteAddress(first.id, { userId: tenant.userId });

      const refreshedSecond = await prisma.address.findUnique({
        where: { id: second.id },
      });
      expect(refreshedSecond!.isDefault).toBe(true);
    });

    it("refuse si non-propriétaire", async () => {
      const tenantA = await seedTenant(prisma);
      const tenantB = await seedTenant(prisma);

      const address = await service.createAddress(
        buildAddressPayload(),
        { userId: tenantA.userId },
      );

      await expect(
        service.deleteAddress(address.id, { userId: tenantB.userId }),
      ).rejects.toMatchObject({
        code: "UNAUTHORIZED_ADDRESS",
      });
    });
  });
});