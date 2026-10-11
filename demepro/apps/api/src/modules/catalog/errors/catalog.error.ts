// apps/api/src/modules/catalog/errors/catalog.error.ts

/**
 * Codes d'erreur du domaine Catalog.
 *
 * Défini comme objet `as const` pour être utilisable
 * à la fois comme valeur runtime (CatalogErrorCode.X)
 * et comme type union (CatalogErrorCode).
 */
export const CatalogErrorCode = {
  /* Produit */
  PRODUCT_NOT_FOUND: "PRODUCT_NOT_FOUND",
  PRODUCT_VARIANT_NOT_FOUND: "PRODUCT_VARIANT_NOT_FOUND",
  PRODUCT_IMAGE_NOT_FOUND: "PRODUCT_IMAGE_NOT_FOUND",
  INVENTORY_NOT_FOUND: "INVENTORY_NOT_FOUND",
  INVALID_INVENTORY_QUANTITY: "INVALID_INVENTORY_QUANTITY",

  /* Boutique / Professionnel */
  STORE_NOT_FOUND: "STORE_NOT_FOUND",
  STORE_NOT_ACTIVE: "STORE_NOT_ACTIVE",
  PROFESSIONAL_NOT_FOUND: "PROFESSIONAL_NOT_FOUND",
  UNAUTHORIZED_STORE: "UNAUTHORIZED_STORE",

  /* Catégorie */
  CATEGORY_NOT_FOUND: "CATEGORY_NOT_FOUND",
  CATEGORY_NOT_ALLOWED: "CATEGORY_NOT_ALLOWED",

  /* Unicité */
  DUPLICATE_SLUG: "DUPLICATE_SLUG",
  DUPLICATE_SKU: "DUPLICATE_SKU",

  /* État produit */
  INVALID_PRODUCT_STATE: "INVALID_PRODUCT_STATE",
  PRODUCT_HAS_NO_VARIANTS: "PRODUCT_HAS_NO_VARIANTS",
  VARIANTS_EXIST: "VARIANTS_EXIST",
  LAST_ACTIVE_VARIANT: "LAST_ACTIVE_VARIANT",

  /* Idempotence */
  IDEMPOTENCY_CONFLICT: "IDEMPOTENCY_CONFLICT",

  /* Auth */
  UNAUTHENTICATED: "UNAUTHENTICATED",
  TOKEN_EXPIRED: "TOKEN_EXPIRED",
  UNAUTHORIZED: "UNAUTHORIZED",
} as const;

export type CatalogErrorCode =
  (typeof CatalogErrorCode)[keyof typeof CatalogErrorCode];

  /**
 * Mapping code → status HTTP.
 * Centralise la politique de codes HTTP du domaine Catalog.
 */
const STATUS_BY_CODE: Record<CatalogErrorCode, number> = {
  /* 404 */
  PRODUCT_NOT_FOUND: 404,
  PRODUCT_VARIANT_NOT_FOUND: 404,
  PRODUCT_IMAGE_NOT_FOUND: 404,
  INVENTORY_NOT_FOUND: 404,
  STORE_NOT_FOUND: 404,
  PROFESSIONAL_NOT_FOUND: 404,
  CATEGORY_NOT_FOUND: 404,

  /* 403 */
  UNAUTHORIZED_STORE: 403,
  UNAUTHORIZED: 403,
  CATEGORY_NOT_ALLOWED: 403,
  STORE_NOT_ACTIVE: 403,

  /* 401 */
  UNAUTHENTICATED: 401,
  TOKEN_EXPIRED: 401,

  /* 409 */
  DUPLICATE_SLUG: 409,
  DUPLICATE_SKU: 409,
  IDEMPOTENCY_CONFLICT: 409,

  /* 422 */
  INVALID_PRODUCT_STATE: 422,
  INVALID_INVENTORY_QUANTITY: 422,
  PRODUCT_HAS_NO_VARIANTS: 422,
  VARIANTS_EXIST: 422,
  LAST_ACTIVE_VARIANT: 422,
};

/**
 * Erreur métier du domaine Catalog.
 */
export class CatalogError extends Error {
  public readonly code: CatalogErrorCode;
  public readonly statusCode: number;

  constructor(
    code: CatalogErrorCode,
    message: string,
    statusCode?: number,
  ) {
    super(message);

    this.name = "CatalogError";
    this.code = code;
    this.statusCode = statusCode ?? STATUS_BY_CODE[code] ?? 400;

    Object.setPrototypeOf(this, CatalogError.prototype);
  }

  toJSON() {
    return {
      code: this.code,
      message: this.message,
      statusCode: this.statusCode,
    };
  }
}
