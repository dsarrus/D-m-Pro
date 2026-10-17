// apps/api/src/modules/payment/errors/payment.error.ts

export const PaymentErrorCode = {
  /* Payment */
  PAYMENT_NOT_FOUND: "PAYMENT_NOT_FOUND",
  PAYMENT_ALREADY_EXISTS: "PAYMENT_ALREADY_EXISTS",
  PAYMENT_ALREADY_PAID: "PAYMENT_ALREADY_PAID",

  /* État */
  INVALID_PAYMENT_STATE: "INVALID_PAYMENT_STATE",
  INVALID_PAYMENT_AMOUNT: "INVALID_PAYMENT_AMOUNT",

  /* Provider */
  PAYMENT_PROVIDER_NOT_SUPPORTED: "PAYMENT_PROVIDER_NOT_SUPPORTED",
  PAYMENT_PROVIDER_ERROR: "PAYMENT_PROVIDER_ERROR",
  PAYMENT_WEBHOOK_INVALID_SIGNATURE: "PAYMENT_WEBHOOK_INVALID_SIGNATURE",
  PAYMENT_WEBHOOK_INVALID_PAYLOAD: "PAYMENT_WEBHOOK_INVALID_PAYLOAD",

  /* Order */
  ORDER_NOT_FOUND: "ORDER_NOT_FOUND",
  ORDER_NOT_PAYABLE: "ORDER_NOT_PAYABLE",

  /* Refund */
  REFUND_NOT_ALLOWED: "REFUND_NOT_ALLOWED",

  /* Auth */
  UNAUTHORIZED_PAYMENT: "UNAUTHORIZED_PAYMENT",
  UNAUTHORIZED: "UNAUTHORIZED",
  UNAUTHENTICATED: "UNAUTHENTICATED",

  // Booking
BOOKING_NOT_FOUND: "BOOKING_NOT_FOUND",
UNAUTHORIZED_BOOKING: "UNAUTHORIZED_BOOKING",
BOOKING_NOT_PAYABLE: "BOOKING_NOT_PAYABLE",
} as const;

export type PaymentErrorCode =
  (typeof PaymentErrorCode)[keyof typeof PaymentErrorCode];

const STATUS_BY_CODE: Record<PaymentErrorCode, number> = {
  PAYMENT_NOT_FOUND: 404,
  PAYMENT_ALREADY_EXISTS: 409,
  PAYMENT_ALREADY_PAID: 409,
  INVALID_PAYMENT_STATE: 422,
  INVALID_PAYMENT_AMOUNT: 422,
  PAYMENT_PROVIDER_NOT_SUPPORTED: 422,
  PAYMENT_PROVIDER_ERROR: 502,
  PAYMENT_WEBHOOK_INVALID_SIGNATURE: 401,
  PAYMENT_WEBHOOK_INVALID_PAYLOAD: 400,
  ORDER_NOT_FOUND: 404,
  ORDER_NOT_PAYABLE: 422,
  REFUND_NOT_ALLOWED: 422,
  UNAUTHORIZED_PAYMENT: 403,
  UNAUTHORIZED: 403,
  UNAUTHENTICATED: 401,
  BOOKING_NOT_FOUND: 404,
UNAUTHORIZED_BOOKING: 403,
BOOKING_NOT_PAYABLE: 422,
};

export class PaymentError extends Error {
  public readonly code: PaymentErrorCode;
  public readonly statusCode: number;

  constructor(code: PaymentErrorCode, message: string, statusCode?: number) {
    super(message);
    this.name = "PaymentError";
    this.code = code;
    this.statusCode = statusCode ?? STATUS_BY_CODE[code] ?? 400;
    Object.setPrototypeOf(this, PaymentError.prototype);
  }

  toJSON() {
    return {
      code: this.code,
      message: this.message,
      statusCode: this.statusCode,
    };
  }
}