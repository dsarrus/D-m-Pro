// apps/api/src/modules/review/errors/review.error.ts

export const ReviewErrorCode = {
  REVIEW_NOT_FOUND: "REVIEW_NOT_FOUND",
  REVIEW_ALREADY_EXISTS: "REVIEW_ALREADY_EXISTS",
  REVIEW_UPDATE_WINDOW_EXPIRED: "REVIEW_UPDATE_WINDOW_EXPIRED",
  REVIEW_NOT_VISIBLE: "REVIEW_NOT_VISIBLE",

  INVALID_REVIEW_TARGET: "INVALID_REVIEW_TARGET",
  INVALID_REVIEW_RATING: "INVALID_REVIEW_RATING",
  INVALID_REVIEW_STATE: "INVALID_REVIEW_STATE",

  ORDER_NOT_DELIVERED: "ORDER_NOT_DELIVERED",
  ORDER_NOT_FOUND: "ORDER_NOT_FOUND",

  REPORT_ALREADY_EXISTS: "REPORT_ALREADY_EXISTS",
  REPORT_NOT_FOUND: "REPORT_NOT_FOUND",

  UNAUTHORIZED_REVIEW: "UNAUTHORIZED_REVIEW",
  UNAUTHORIZED: "UNAUTHORIZED",
  UNAUTHENTICATED: "UNAUTHENTICATED",
} as const;

export type ReviewErrorCode =
  (typeof ReviewErrorCode)[keyof typeof ReviewErrorCode];

const STATUS_BY_CODE: Record<ReviewErrorCode, number> = {
  REVIEW_NOT_FOUND: 404,
  REVIEW_ALREADY_EXISTS: 409,
  REVIEW_UPDATE_WINDOW_EXPIRED: 422,
  REVIEW_NOT_VISIBLE: 403,
  INVALID_REVIEW_TARGET: 422,
  INVALID_REVIEW_RATING: 422,
  INVALID_REVIEW_STATE: 422,
  ORDER_NOT_DELIVERED: 422,
  ORDER_NOT_FOUND: 404,
  REPORT_ALREADY_EXISTS: 409,
  REPORT_NOT_FOUND: 404,
  UNAUTHORIZED_REVIEW: 403,
  UNAUTHORIZED: 403,
  UNAUTHENTICATED: 401,
};

export class ReviewError extends Error {
  public readonly code: ReviewErrorCode;
  public readonly statusCode: number;

  constructor(code: ReviewErrorCode, message: string, statusCode?: number) {
    super(message);
    this.name = "ReviewError";
    this.code = code;
    this.statusCode = statusCode ?? STATUS_BY_CODE[code] ?? 400;
    Object.setPrototypeOf(this, ReviewError.prototype);
  }

  toJSON() {
    return {
      code: this.code,
      message: this.message,
      statusCode: this.statusCode,
    };
  }
}