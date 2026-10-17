// apps/api/src/modules/quotes/errors/quote.error.ts

export const QuoteErrorCode = {
  QUOTE_NOT_FOUND: "QUOTE_NOT_FOUND",
  QUOTE_RESPONSE_NOT_FOUND: "QUOTE_RESPONSE_NOT_FOUND",

  QUOTE_ALREADY_RESPONDED: "QUOTE_ALREADY_RESPONDED",
  QUOTE_ALREADY_CONVERTED: "QUOTE_ALREADY_CONVERTED",
  QUOTE_EXPIRED: "QUOTE_EXPIRED",
  QUOTE_INVALID_STATE: "QUOTE_INVALID_STATE",

  INVALID_QUOTE_AMOUNT: "INVALID_QUOTE_AMOUNT",
  INVALID_QUOTE_DATE: "INVALID_QUOTE_DATE",

  SERVICE_NOT_FOUND: "SERVICE_NOT_FOUND",
  SERVICE_NOT_ACTIVE: "SERVICE_NOT_ACTIVE",

  UNAUTHORIZED_QUOTE: "UNAUTHORIZED_QUOTE",
  UNAUTHORIZED_SERVICE: "UNAUTHORIZED_SERVICE",
  UNAUTHORIZED: "UNAUTHORIZED",
  UNAUTHENTICATED: "UNAUTHENTICATED",
} as const;

export type QuoteErrorCode =
  (typeof QuoteErrorCode)[keyof typeof QuoteErrorCode];

const STATUS_BY_CODE: Record<QuoteErrorCode, number> = {
  QUOTE_NOT_FOUND: 404,
  QUOTE_RESPONSE_NOT_FOUND: 404,
  SERVICE_NOT_FOUND: 404,

  QUOTE_ALREADY_RESPONDED: 409,
  QUOTE_ALREADY_CONVERTED: 409,

  QUOTE_EXPIRED: 422,
  QUOTE_INVALID_STATE: 422,
  INVALID_QUOTE_AMOUNT: 422,
  INVALID_QUOTE_DATE: 422,
  SERVICE_NOT_ACTIVE: 422,

  UNAUTHORIZED_QUOTE: 403,
  UNAUTHORIZED_SERVICE: 403,
  UNAUTHORIZED: 403,
  UNAUTHENTICATED: 401,
};

export class QuoteError extends Error {
  public readonly code: QuoteErrorCode;
  public readonly statusCode: number;

  constructor(code: QuoteErrorCode, message: string, statusCode?: number) {
    super(message);
    this.name = "QuoteError";
    this.code = code;
    this.statusCode = statusCode ?? STATUS_BY_CODE[code] ?? 400;
    Object.setPrototypeOf(this, QuoteError.prototype);
  }

  toJSON() {
    return {
      code: this.code,
      message: this.message,
      statusCode: this.statusCode,
    };
  }
}