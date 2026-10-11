// apps/api/src/modules/verification/dtos/verification.dto.ts

import { z } from "zod";

export const upgradeToTrustedSchema = z.object({
  selfieKey: z.string().trim().min(1).max(500),
});

export const requestCertificationSchema = z.object({
  kycDocumentKey: z.string().trim().min(1).max(500),
});

export const rejectCertificationSchema = z.object({
  reason: z.string().trim().min(3).max(500),
});

export const verificationIdParamSchema = z.object({
  verificationId: z.string().uuid(),
});

export type UpgradeToTrustedDto = z.infer<typeof upgradeToTrustedSchema>;
export type RequestCertificationDto = z.infer<
  typeof requestCertificationSchema
>;
export type RejectCertificationDto = z.infer<
  typeof rejectCertificationSchema
>;