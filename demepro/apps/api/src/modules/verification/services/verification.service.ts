// apps/api/src/modules/verification/services/verification.service.ts

import { Prisma, PrismaClient } from "../../../generated/prisma/client";

import {
  VerificationError,
  VerificationErrorCode,
} from "../errors/verification-error";

/* ================================================================
 * TYPES
 * ================================================================ */

export type AuthContext = {
  userId: string;
  role?: string;
  permissions?: string[];
};

export type VerificationStatusView = {
  level: "BASIC" | "TRUSTED" | "CERTIFIED";
  successfulTransactions: number;
  nextLevel: "TRUSTED" | "CERTIFIED" | null;
  requirements: Array<{
    key: string;
    label: string;
    met: boolean;
  }>;
  verifiedAt: string | null;
  certifiedAt: string | null;
};

const SERIALIZABLE_MAX_ATTEMPTS = 3;
const TRANSACTION_TIMEOUT_MS = 15000;

/* ================================================================
 * SERVICE
 * ================================================================ */

export class VerificationService {
  constructor(private readonly prisma: PrismaClient) {}

  /* ================================================================
   * HELPERS
   * ================================================================ */

  private async withSerializableRetry<T>(
    fn: () => Promise<T>,
    maxAttempts = SERIALIZABLE_MAX_ATTEMPTS,
  ): Promise<T> {
    let attempt = 0;

    // eslint-disable-next-line no-constant-condition
    while (true) {
      try {
        return await fn();
      } catch (error) {
        attempt++;

        const isSerializationConflict =
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === "P2034";

        if (!isSerializationConflict || attempt >= maxAttempts) {
          throw error;
        }

        const delay =
          Math.min(100 * 2 ** attempt, 2000) +
          Math.floor(Math.random() * 100);

        await new Promise((r) => setTimeout(r, delay));
      }
    }
  }

  private async loadProfessional(
    db: Prisma.TransactionClient | PrismaClient,
    userId: string,
  ) {
    const professional = await db.professionalProfile.findUnique({
      where: { userId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            phone: true,
            phoneVerifiedAt: true,
            emailVerifiedAt: true,
          },
        },
      },
    });

    if (!professional) {
      throw new VerificationError(
        VerificationErrorCode.PROFESSIONAL_NOT_FOUND,
        "Profil professionnel introuvable.",
      );
    }

    return professional;
  }

  /* ================================================================
   * GET — État de vérification
   * ================================================================ */

  async getMyVerificationStatus(
    ctx: AuthContext,
  ): Promise<VerificationStatusView> {
    const professional = await this.loadProfessional(
      this.prisma,
      ctx.userId,
    );

    const user = professional.user;

    /* Calculer les conditions restantes pour le prochain niveau */
    const requirements: VerificationStatusView["requirements"] = [];
    let nextLevel: VerificationStatusView["nextLevel"] = null;

    if (professional.verificationLevel === "BASIC") {
      nextLevel = "TRUSTED";
      requirements.push(
        {
          key: "phoneVerified",
          label: "Numéro de téléphone confirmé",
          met: Boolean(user.phoneVerifiedAt),
        },
        {
          key: "successfulTransactions",
          label: "3 transactions réussies",
          met: professional.successfulTransactions >= 3,
        },
        {
          key: "selfie",
          label: "Selfie de vérification",
          met: false, // à uploader
        },
      );
    } else if (professional.verificationLevel === "TRUSTED") {
      nextLevel = "CERTIFIED";
      requirements.push(
        {
          key: "kycDocument",
          label: "Pièce d'identité (CNI, passeport)",
          met: false,
        },
        {
          key: "manualReview",
          label: "Validation par un administrateur",
          met: false,
        },
      );
    }

    return {
      level: professional.verificationLevel,
      successfulTransactions: professional.successfulTransactions,
      nextLevel,
      requirements,
      verifiedAt: professional.verifiedAt?.toISOString() ?? null,
      certifiedAt: professional.certifiedAt?.toISOString() ?? null,
    };
  }

  /* ================================================================
   * PHASE 2 — Upgrade vers TRUSTED (auto-validation)
   * ================================================================ */

  /**
   * Passe au niveau TRUSTED.
   *
   * Conditions :
   *  - Téléphone confirmé
   *  - ≥ 3 transactions réussies
   *  - Selfie uploadé
   *
   * Auto-validé (pas d'admin requis).
   */
  async upgradeToTrusted(
    selfieKey: string,
    ctx: AuthContext,
  ) {
    try {
      return await this.withSerializableRetry(() =>
        this.prisma.$transaction(
          async (tx) => {
            const professional = await this.loadProfessional(
              tx,
              ctx.userId,
            );

            /* ----- Vérifier le niveau actuel ----- */
            if (professional.verificationLevel !== "BASIC") {
              throw new VerificationError(
                VerificationErrorCode.INVALID_LEVEL,
                `Vous êtes déjà au niveau ${professional.verificationLevel}.`,
              );
            }

            /* ----- Vérifier le téléphone ----- */
            if (!professional.user.phoneVerifiedAt) {
              throw new VerificationError(
                VerificationErrorCode.PHONE_NOT_VERIFIED,
                "Confirmez votre numéro de téléphone d'abord.",
              );
            }

            /* ----- Vérifier les transactions ----- */
            if (professional.successfulTransactions < 3) {
              throw new VerificationError(
                VerificationErrorCode.INSUFFICIENT_TRANSACTIONS,
                `Vous devez avoir au moins 3 transactions réussies (actuellement : ${professional.successfulTransactions}).`,
              );
            }

            /* ----- Vérifier le selfie ----- */
            if (!selfieKey || selfieKey.trim().length === 0) {
              throw new VerificationError(
                VerificationErrorCode.INVALID_SELFIE,
                "Le selfie est obligatoire.",
              );
            }

            /* ----- Upgrade ----- */
            const updated = await tx.professionalProfile.update({
              where: { id: professional.id },
              data: {
                verificationLevel: "TRUSTED",
                verificationStatus: "VERIFIED", // compat
                selfieKey,
                verifiedAt: new Date(),
              },
            });

            /* ----- Notifier le pro ----- */
            await tx.notification.create({
              data: {
                userId: professional.userId,
                type: "VERIFICATION_UPGRADED",
                title: "Félicitations, vous êtes maintenant Vérifié !",
                body: "Votre profil porte désormais le badge Vérifié. Vos produits gagnent en visibilité.",
                data: { level: "TRUSTED" },
              },
            });

            return updated;
          },
          {
            isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
            timeout: TRANSACTION_TIMEOUT_MS,
          },
        ),
      );
    } catch (error) {
      this.mapPrismaError(error);
    }
  }

  /* ================================================================
   * PHASE 3 — Upgrade vers CERTIFIED (validation admin)
   * ================================================================ */

  /**
   * Demande de certification (KYC).
   *
   * Le pro upload un document + une demande.
   * Un admin valide ensuite.
   */
  async requestCertification(
    kycDocumentKey: string,
    ctx: AuthContext,
  ) {
    try {
      return await this.withSerializableRetry(() =>
        this.prisma.$transaction(
          async (tx) => {
            const professional = await this.loadProfessional(
              tx,
              ctx.userId,
            );

            /* ----- Vérifier le niveau actuel ----- */
            if (professional.verificationLevel !== "TRUSTED") {
              throw new VerificationError(
                VerificationErrorCode.INVALID_LEVEL,
                "Vous devez d'abord être au niveau Vérifié.",
              );
            }

            if (!kycDocumentKey || kycDocumentKey.trim().length === 0) {
              throw new VerificationError(
                VerificationErrorCode.INVALID_DOCUMENT,
                "Le document KYC est obligatoire.",
              );
            }

            /* ----- Créer une demande de vérification ----- */
            const verification = await tx.verification.create({
              data: {
                userId: professional.userId,
                type: "PROFESSIONAL",
                status: "PENDING",
                documentKey: kycDocumentKey,
              },
            });

            /* ----- Notifier les admins (via notification) ----- */
            await tx.notification.create({
              data: {
                userId: professional.userId,
                type: "CERTIFICATION_REQUESTED",
                title: "Demande de certification envoyée",
                body: "Votre demande est en cours d'examen. Réponse sous 48h.",
                data: { verificationId: verification.id },
              },
            });

            return verification;
          },
          {
            isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
            timeout: TRANSACTION_TIMEOUT_MS,
          },
        ),
      );
    } catch (error) {
      this.mapPrismaError(error);
    }
  }

  /**
   * Admin : approuve une certification.
   */
  async approveCertification(
    verificationId: string,
    ctx: AuthContext,
  ) {
    if (ctx.role !== "ADMIN" && ctx.role !== "SUPER_ADMIN") {
      throw new VerificationError(
        VerificationErrorCode.UNAUTHORIZED,
        "Action réservée aux administrateurs.",
      );
    }

    try {
      return await this.withSerializableRetry(() =>
        this.prisma.$transaction(
          async (tx) => {
            const verification = await tx.verification.findUnique({
              where: { id: verificationId },
            });

            if (!verification) {
              throw new VerificationError(
                VerificationErrorCode.VERIFICATION_NOT_FOUND,
                "Demande introuvable.",
              );
            }

            if (verification.status !== "PENDING") {
              throw new VerificationError(
                VerificationErrorCode.INVALID_VERIFICATION_STATE,
                `Cette demande a déjà été traitée (${verification.status}).`,
              );
            }

            /* ----- Mettre à jour la demande ----- */
            await tx.verification.update({
              where: { id: verificationId },
              data: {
                status: "VERIFIED",
                reviewedById: ctx.userId,
                reviewedAt: new Date(),
              },
            });

            /* ----- Upgrade du professional ----- */
            const professional = await tx.professionalProfile.update({
              where: { userId: verification.userId },
              data: {
                verificationLevel: "CERTIFIED",
                verificationStatus: "VERIFIED",
                kycDocumentKey: verification.documentKey,
                certifiedAt: new Date(),
                certifiedByUserId: ctx.userId,
              },
            });

            /* ----- Notifier le pro ----- */
            await tx.notification.create({
              data: {
                userId: verification.userId,
                type: "VERIFICATION_CERTIFIED",
                title: "Félicitations, vous êtes Certifié DɛmɛPro !",
                body: "Votre profil porte désormais le badge Certifié. Accès aux plans premium débloqué.",
                data: { level: "CERTIFIED" },
              },
            });

            return professional;
          },
          {
            isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
            timeout: TRANSACTION_TIMEOUT_MS,
          },
        ),
      );
    } catch (error) {
      this.mapPrismaError(error);
    }
  }

  /**
   * Admin : rejette une certification.
   */
  async rejectCertification(
  verificationId: string,
  reason: string,
  ctx: AuthContext,
) {
  if (ctx.role !== "ADMIN" && ctx.role !== "SUPER_ADMIN") {
    throw new VerificationError(
      VerificationErrorCode.UNAUTHORIZED,
      "Action réservée aux administrateurs.",
    );
  }

  try {
    return await this.withSerializableRetry(() =>
      this.prisma.$transaction(
        async (tx) => {
          const verification = await tx.verification.findUnique({
            where: { id: verificationId },
          });

          if (!verification) {
            throw new VerificationError(
              VerificationErrorCode.VERIFICATION_NOT_FOUND,
              "Demande introuvable.",
            );
          }

          if (verification.status !== "PENDING") {
            throw new VerificationError(
              VerificationErrorCode.INVALID_VERIFICATION_STATE,
              `Cette demande a déjà été traitée (${verification.status}).`,
            );
          }

          /* ✅ Récupérer l'objet MIS À JOUR */
          const rejected = await tx.verification.update({
            where: { id: verificationId },
            data: {
              status: "REJECTED",
              notes: reason,
              reviewedById: ctx.userId,
              reviewedAt: new Date(),
            },
          });

          await tx.notification.create({
            data: {
              userId: verification.userId,
              type: "VERIFICATION_REJECTED",
              title: "Demande de certification refusée",
              body: `Motif : ${reason}. Vous pouvez soumettre une nouvelle demande.`,
              data: { verificationId: verification.id },
            },
          });

          return rejected;  // ✅ objet APRÈS update (status: REJECTED)
        },
        {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
          timeout: TRANSACTION_TIMEOUT_MS,
        },
      ),
    );
  } catch (error) {
    this.mapPrismaError(error);
  }
}

  /* ================================================================
   * INCRÉMENT — Appelé après chaque transaction réussie
   * ================================================================ */

  /**
   * Incrémente le compteur `successfulTransactions` d'un pro.
   *
   * À appeler après :
   *  - Livraison confirmée d'une commande
   *  - Réalisation d'un service
   *
   * Déclenche automatiquement une notification si le pro peut
   * passer au niveau TRUSTED.
   */
  async incrementSuccessfulTransactions(
    professionalId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<void> {
    const db = tx ?? this.prisma;

    const updated = await db.professionalProfile.update({
      where: { id: professionalId },
      data: {
        successfulTransactions: { increment: 1 },
      },
      select: {
        verificationLevel: true,
        successfulTransactions: true,
        userId: true,
      },
    });

    /* Si le pro atteint 3 transactions et est au niveau BASIC → notifier */
    if (
      updated.verificationLevel === "BASIC" &&
      updated.successfulTransactions === 3
    ) {
      await db.notification.create({
        data: {
          userId: updated.userId,
          type: "VERIFICATION_UPGRADE_AVAILABLE",
          title: "Vous pouvez devenir Vérifié !",
          body: "Bravo ! Vous avez 3 transactions réussies. Ajoutez un selfie pour obtenir le badge Vérifié.",
          data: { targetLevel: "TRUSTED" },
        },
      });
    }
  }

  /* ================================================================
   * MAPPING PRISMA
   * ================================================================ */

  private mapPrismaError(error: unknown): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        throw new VerificationError(
          VerificationErrorCode.DUPLICATE_REQUEST,
          "Une demande existe déjà.",
        );
      }
    }

    throw error;
  }
}