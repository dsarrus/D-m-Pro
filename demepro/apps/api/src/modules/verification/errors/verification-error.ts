// apps/api/src/modules/verification/errors/verification-error.ts

export const VerificationErrorCode = {
  /* Professional */
  PROFESSIONAL_NOT_FOUND: "PROFESSIONAL_NOT_FOUND",
  PHONE_NOT_VERIFIED: "PHONE_NOT_VERIFIED",
  EMAIL_NOT_VERIFIED: "EMAIL_NOT_VERIFIED",

  /* Niveau */
  INVALID_LEVEL: "INVALID_LEVEL",
  INSUFFICIENT_TRANSACTIONS: "INSUFFICIENT_TRANSACTIONS",

  /* Selfie / document */
  INVALID_SELFIE: "INVALID_SELFIE",
  INVALID_DOCUMENT: "INVALID_DOCUMENT",

  /* Demande */
  VERIFICATION_NOT_FOUND: "VERIFICATION_NOT_FOUND",
  INVALID_VERIFICATION_STATE: "INVALID_VERIFICATION_STATE",
  DUPLICATE_REQUEST: "DUPLICATE_REQUEST",

  /* Auth */
  UNAUTHORIZED: "UNAUTHORIZED",
  UNAUTHENTICATED: "UNAUTHENTICATED",
} as const;

export type VerificationErrorCode =
  (typeof VerificationErrorCode)[keyof typeof VerificationErrorCode];

const STATUS_BY_CODE: Record<VerificationErrorCode, number> = {
  PROFESSIONAL_NOT_FOUND: 404,
  PHONE_NOT_VERIFIED: 403,
  EMAIL_NOT_VERIFIED: 403,
  INVALID_LEVEL: 422,
  INSUFFICIENT_TRANSACTIONS: 422,
  INVALID_SELFIE: 400,
  INVALID_DOCUMENT: 400,
  VERIFICATION_NOT_FOUND: 404,
  INVALID_VERIFICATION_STATE: 422,
  DUPLICATE_REQUEST: 409,
  UNAUTHORIZED: 403,
  UNAUTHENTICATED: 401,
};

export class VerificationError extends Error {
  public readonly code: VerificationErrorCode;
  public readonly statusCode: number;

  constructor(
    code: VerificationErrorCode,
    message: string,
    statusCode?: number,
  ) {
    super(message);
    this.name = "VerificationError";
    this.code = code;
    this.statusCode = statusCode ?? STATUS_BY_CODE[code] ?? 400;
    Object.setPrototypeOf(this, VerificationError.prototype);
  }

  toJSON() {
    return {
      code: this.code,
      message: this.message,
      statusCode: this.statusCode,
    };
  }
}