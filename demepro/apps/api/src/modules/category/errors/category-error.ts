// apps/api/src/modules/category/errors/category-error.ts

export const CategoryErrorCode = {
  CATEGORY_NOT_FOUND: "CATEGORY_NOT_FOUND",
  CATEGORY_SLUG_TAKEN: "CATEGORY_SLUG_TAKEN",
  CATEGORY_HAS_CHILDREN: "CATEGORY_HAS_CHILDREN",
  CATEGORY_HAS_PRODUCTS: "CATEGORY_HAS_PRODUCTS",
  CATEGORY_HAS_SERVICES: "CATEGORY_HAS_SERVICES",
  CATEGORY_MAX_DEPTH: "CATEGORY_MAX_DEPTH",
  CATEGORY_INVALID_PARENT: "CATEGORY_INVALID_PARENT",
  CATEGORY_CYCLE: "CATEGORY_CYCLE",
  CATEGORY_TYPE_MISMATCH: "CATEGORY_TYPE_MISMATCH",

  VERTICAL_NOT_FOUND: "VERTICAL_NOT_FOUND",

  UNAUTHORIZED: "UNAUTHORIZED",
  UNAUTHENTICATED: "UNAUTHENTICATED",
} as const;

export type CategoryErrorCode =
  (typeof CategoryErrorCode)[keyof typeof CategoryErrorCode];

const STATUS_BY_CODE: Record<CategoryErrorCode, number> = {
  CATEGORY_NOT_FOUND: 404,
  CATEGORY_SLUG_TAKEN: 409,
  CATEGORY_HAS_CHILDREN: 422,
  CATEGORY_HAS_PRODUCTS: 422,
  CATEGORY_HAS_SERVICES: 422,
  CATEGORY_MAX_DEPTH: 422,
  CATEGORY_INVALID_PARENT: 422,
  CATEGORY_CYCLE: 422,
  CATEGORY_TYPE_MISMATCH: 422,
  VERTICAL_NOT_FOUND: 404,
  UNAUTHORIZED: 403,
  UNAUTHENTICATED: 401,
};

export class CategoryError extends Error {
  public readonly code: CategoryErrorCode;
  public readonly statusCode: number;

  constructor(
    code: CategoryErrorCode,
    message: string,
    statusCode?: number,
  ) {
    super(message);
    this.name = "CategoryError";
    this.code = code;
    this.statusCode = statusCode ?? STATUS_BY_CODE[code] ?? 400;
    Object.setPrototypeOf(this, CategoryError.prototype);
  }

  toJSON() {
    return {
      code: this.code,
      message: this.message,
      statusCode: this.statusCode,
    };
  }
}