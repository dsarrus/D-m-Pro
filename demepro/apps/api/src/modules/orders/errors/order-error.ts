// apps/api/src/modules/orders/errors/order-error.ts

export const OrderErrorCode = {
  ORDER_NOT_FOUND: "ORDER_NOT_FOUND",
  ORDER_ITEM_NOT_FOUND: "ORDER_ITEM_NOT_FOUND",

  /* État */
  INVALID_ORDER_STATE: "INVALID_ORDER_STATE",
  EMPTY_ORDER: "EMPTY_ORDER",

  /* Stock */
  INSUFFICIENT_STOCK: "INSUFFICIENT_STOCK",

  /* Produit */
  PRODUCT_NOT_ACTIVE: "PRODUCT_NOT_ACTIVE",
  VARIANT_NOT_ACTIVE: "VARIANT_NOT_ACTIVE",
  PRODUCT_NOT_FOUND: "PRODUCT_NOT_FOUND",
  VARIANT_NOT_FOUND: "VARIANT_NOT_FOUND",
  INVENTORY_NOT_FOUND: "INVENTORY_NOT_FOUND",

  /* Ownership */
  UNAUTHORIZED_ORDER: "UNAUTHORIZED_ORDER",
  UNAUTHORIZED_STORE: "UNAUTHORIZED_STORE",
  UNAUTHORIZED: "UNAUTHORIZED",
  UNAUTHENTICATED: "UNAUTHENTICATED",

  /* Idempotence */
  IDEMPOTENCY_CONFLICT: "IDEMPOTENCY_CONFLICT",
} as const;

export type OrderErrorCode =
  (typeof OrderErrorCode)[keyof typeof OrderErrorCode];

const STATUS_BY_CODE: Record<OrderErrorCode, number> = {
  ORDER_NOT_FOUND: 404,
  ORDER_ITEM_NOT_FOUND: 404,
  PRODUCT_NOT_FOUND: 404,
  VARIANT_NOT_FOUND: 404,
  INVENTORY_NOT_FOUND: 404,

  INVALID_ORDER_STATE: 422,
  EMPTY_ORDER: 422,
  INSUFFICIENT_STOCK: 422,
  PRODUCT_NOT_ACTIVE: 422,
  VARIANT_NOT_ACTIVE: 422,

  UNAUTHORIZED_ORDER: 403,
  UNAUTHORIZED_STORE: 403,
  UNAUTHORIZED: 403,
  UNAUTHENTICATED: 401,

  IDEMPOTENCY_CONFLICT: 409,
};

export class OrderError extends Error {
  public readonly code: OrderErrorCode;
  public readonly statusCode: number;

  constructor(code: OrderErrorCode, message: string, statusCode?: number) {
    super(message);
    this.name = "OrderError";
    this.code = code;
    this.statusCode = statusCode ?? STATUS_BY_CODE[code] ?? 400;
    Object.setPrototypeOf(this, OrderError.prototype);
  }

  toJSON() {
    return {
      code: this.code,
      message: this.message,
      statusCode: this.statusCode,
    };
  }
}