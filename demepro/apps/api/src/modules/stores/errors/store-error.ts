// apps/api/src/modules/stores/errors/store-error.ts

export const StoreErrorCode = {
  /* Store */
  STORE_NOT_FOUND: "STORE_NOT_FOUND",
  STORE_SLUG_TAKEN: "STORE_SLUG_TAKEN",
  STORE_ALREADY_EXISTS: "STORE_ALREADY_EXISTS",  // 1 seul store par pro
  STORE_NOT_ACTIVE: "STORE_NOT_ACTIVE",
  STORE_HAS_PRODUCTS: "STORE_HAS_PRODUCTS",

  /* État */
  INVALID_STORE_STATE: "INVALID_STORE_STATE",

  /* Professionnel */
  PROFESSIONAL_NOT_FOUND: "PROFESSIONAL_NOT_FOUND",
  PROFESSIONAL_NOT_VERIFIED: "PROFESSIONAL_NOT_VERIFIED",

  /* Ownership */
  UNAUTHORIZED_STORE: "UNAUTHORIZED_STORE",
  UNAUTHORIZED: "UNAUTHORIZED",
  UNAUTHENTICATED: "UNAUTHENTICATED",
} as const;

export type StoreErrorCode =
  (typeof StoreErrorCode)[keyof typeof StoreErrorCode];

const STATUS_BY_CODE: Record<StoreErrorCode, number> = {
  STORE_NOT_FOUND: 404,
  STORE_SLUG_TAKEN: 409,
  STORE_ALREADY_EXISTS: 409,
  STORE_HAS_PRODUCTS: 422,
  STORE_NOT_ACTIVE: 403,
  INVALID_STORE_STATE: 422,
  PROFESSIONAL_NOT_FOUND: 404,
  PROFESSIONAL_NOT_VERIFIED: 403,
  UNAUTHORIZED_STORE: 403,
  UNAUTHORIZED: 403,
  UNAUTHENTICATED: 401,
};

export class StoreError extends Error {
  public readonly code: StoreErrorCode;
  public readonly statusCode: number;  // ⭐ doit exister

  constructor(
    code: StoreErrorCode,
    message: string,
    statusCode?: number,
  ) {
    super(message);
    this.name = "StoreError";
    this.code = code;
    this.statusCode = statusCode ?? STATUS_BY_CODE[code] ?? 400;  // ⭐ assignation
    Object.setPrototypeOf(this, StoreError.prototype);
  }
}