// apps/api/src/modules/verification/tests/verification.service.integration.test.ts

import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";

import { PrismaClient } from "../../../generated/prisma/client";
import { startPostgres, stopPostgres } from "../../../../tests/setup/postgres";
import {
  seedProfessionalWithoutStore,
  seedAdmin,
  truncateAll,
} from "../../../../tests/helpers/factories";

import { VerificationService } from "../services/verification.service";

describe("VerificationService (integration)", () => {
  let prisma: PrismaClient;
  let service: VerificationService;

  beforeAll(async () => {
    const ctx = await startPostgres();
    prisma = ctx.prisma;
    service = new VerificationService(prisma);
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

  async function setSuccessfulTransactions(
    professionalId: string,
    count: number,
  ) {
    await prisma.professionalProfile.update({
      where: { id: professionalId },
      data: { successfulTransactions: count },
    });
  }

  /* ================================================================
   * GET STATUS
   * ================================================================ */

  describe("getMyVerificationStatus", () => {
    it("retourne le niveau BASIC par défaut", async () => {
      const tenant = await seedProfessionalWithoutStore(prisma);

      const status = await service.getMyVerificationStatus({
        userId: tenant.userId,
      });

      expect(status.level).toBe("BASIC");
      expect(status.successfulTransactions).toBe(0);
      expect(status.nextLevel).toBe("TRUSTED");
      expect(status.requirements).toHaveLength(3);
    });

    it("retourne TRUSTED après upgrade", async () => {
      const tenant = await seedProfessionalWithoutStore(prisma);
      await setSuccessfulTransactions(tenant.professionalId, 5);

      await service.upgradeToTrusted("selfie.jpg", {
        userId: tenant.userId,
      });

      const status = await service.getMyVerificationStatus({
        userId: tenant.userId,
      });

      expect(status.level).toBe("TRUSTED");
      expect(status.verifiedAt).toBeDefined();
      expect(status.nextLevel).toBe("CERTIFIED");
    });
  });

  /* ================================================================
   * UPGRADE TRUSTED
   * ================================================================ */

  describe("upgradeToTrusted", () => {
    it("passe au niveau TRUSTED si toutes les conditions sont remplies", async () => {
      const tenant = await seedProfessionalWithoutStore(prisma);
      await setSuccessfulTransactions(tenant.professionalId, 3);

      const result = await service.upgradeToTrusted("selfie.jpg", {
        userId: tenant.userId,
      });

      expect(result.verificationLevel).toBe("TRUSTED");
      expect(result.verifiedAt).toBeDefined();
      expect(result.selfieKey).toBe("selfie.jpg");
    });

    it("refuse si téléphone non confirmé", async () => {
      const tenant = await seedProfessionalWithoutStore(prisma);
      await setSuccessfulTransactions(tenant.professionalId, 5);

      /* Retirer la confirmation du téléphone */
      await prisma.user.update({
        where: { id: tenant.userId },
        data: { phoneVerifiedAt: null },
      });

      await expect(
        service.upgradeToTrusted("selfie.jpg", {
          userId: tenant.userId,
        }),
      ).rejects.toMatchObject({
        code: "PHONE_NOT_VERIFIED",
      });
    });

    it("refuse si < 3 transactions", async () => {
      const tenant = await seedProfessionalWithoutStore(prisma);
      await setSuccessfulTransactions(tenant.professionalId, 2);

      await expect(
        service.upgradeToTrusted("selfie.jpg", {
          userId: tenant.userId,
        }),
      ).rejects.toMatchObject({
        code: "INSUFFICIENT_TRANSACTIONS",
      });
    });

    it("refuse si déjà au niveau TRUSTED", async () => {
      const tenant = await seedProfessionalWithoutStore(prisma);
      await setSuccessfulTransactions(tenant.professionalId, 5);

      await service.upgradeToTrusted("selfie.jpg", {
        userId: tenant.userId,
      });

      await expect(
        service.upgradeToTrusted("selfie2.jpg", {
          userId: tenant.userId,
        }),
      ).rejects.toMatchObject({
        code: "INVALID_LEVEL",
      });
    });

    it("refuse si le selfie est vide", async () => {
      const tenant = await seedProfessionalWithoutStore(prisma);
      await setSuccessfulTransactions(tenant.professionalId, 5);

      await expect(
        service.upgradeToTrusted("", {
          userId: tenant.userId,
        }),
      ).rejects.toMatchObject({
        code: "INVALID_SELFIE",
      });
    });
  });

  /* ================================================================
   * INCRÉMENT TRANSACTIONS
   * ================================================================ */

  describe("incrementSuccessfulTransactions", () => {
    it("incrémente le compteur", async () => {
      const tenant = await seedProfessionalWithoutStore(prisma);

      await service.incrementSuccessfulTransactions(
        tenant.professionalId,
      );

      const updated = await prisma.professionalProfile.findUnique({
        where: { id: tenant.professionalId },
      });

      expect(updated!.successfulTransactions).toBe(1);
    });

    it("notifie le pro à 3 transactions", async () => {
      const tenant = await seedProfessionalWithoutStore(prisma);

      /* 3 incréments */
      await service.incrementSuccessfulTransactions(tenant.professionalId);
      await service.incrementSuccessfulTransactions(tenant.professionalId);
      await service.incrementSuccessfulTransactions(tenant.professionalId);

      /* Vérifier la notification */
      const notification = await prisma.notification.findFirst({
        where: {
          userId: tenant.userId,
          type: "VERIFICATION_UPGRADE_AVAILABLE",
        },
      });

      expect(notification).toBeDefined();
      expect(notification?.title).toContain("Vérifié");
    });
  });

  /* ================================================================
   * CERTIFICATION (Phase 3)
   * ================================================================ */

  describe("requestCertification / approveCertification", () => {
    it("parcours complet : TRUSTED → demande → approbation → CERTIFIED", async () => {
      const tenant = await seedProfessionalWithoutStore(prisma);
      const admin = await seedAdmin(prisma);

      /* 1. Passer à TRUSTED */
      await setSuccessfulTransactions(tenant.professionalId, 5);
      await service.upgradeToTrusted("selfie.jpg", {
        userId: tenant.userId,
      });

      /* 2. Demander la certification */
      const verification = await service.requestCertification(
        "kyc-doc.pdf",
        { userId: tenant.userId },
      );

      expect(verification.status).toBe("PENDING");

      /* 3. Admin approuve */
      const professional = await service.approveCertification(
        verification.id,
        { userId: admin.userId, role: "ADMIN" },
      );

      expect(professional.verificationLevel).toBe("CERTIFIED");
      expect(professional.certifiedAt).toBeDefined();
    });

    it("refuse la demande si pas encore TRUSTED", async () => {
      const tenant = await seedProfessionalWithoutStore(prisma);

      await expect(
        service.requestCertification("kyc.pdf", {
          userId: tenant.userId,
        }),
      ).rejects.toMatchObject({
        code: "INVALID_LEVEL",
      });
    });

    it("refuse l'approbation si non-admin", async () => {
      const tenant = await seedProfessionalWithoutStore(prisma);

      await expect(
        service.approveCertification("some-id", {
          userId: tenant.userId,
          role: "PROFESSIONAL",
        }),
      ).rejects.toMatchObject({
        code: "UNAUTHORIZED",
      });
    });

    it("refuse l'approbation d'une demande déjà traitée", async () => {
      const tenant = await seedProfessionalWithoutStore(prisma);
      const admin = await seedAdmin(prisma);

      await setSuccessfulTransactions(tenant.professionalId, 5);
      await service.upgradeToTrusted("selfie.jpg", {
        userId: tenant.userId,
      });

      const verification = await service.requestCertification(
        "kyc.pdf",
        { userId: tenant.userId },
      );

      await service.approveCertification(verification.id, {
        userId: admin.userId,
        role: "ADMIN",
      });

      /* Deuxième approbation */
      await expect(
        service.approveCertification(verification.id, {
          userId: admin.userId,
          role: "ADMIN",
        }),
      ).rejects.toMatchObject({
        code: "INVALID_VERIFICATION_STATE",
      });
    });

    it("rejette une certification avec motif", async () => {
      const tenant = await seedProfessionalWithoutStore(prisma);
      const admin = await seedAdmin(prisma);

      await setSuccessfulTransactions(tenant.professionalId, 5);
      await service.upgradeToTrusted("selfie.jpg", {
        userId: tenant.userId,
      });

      const verification = await service.requestCertification(
        "kyc-flou.pdf",
        { userId: tenant.userId },
      );

      const rejected = await service.rejectCertification(
        verification.id,
        "Document illisible",
        { userId: admin.userId, role: "ADMIN" },
      );

      expect(rejected.status).toBe("REJECTED");
      expect(rejected.notes).toBe("Document illisible");
    });
  });
});