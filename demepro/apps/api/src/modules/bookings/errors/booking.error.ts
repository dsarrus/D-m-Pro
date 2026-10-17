// apps/api/src/modules/bookings/errors/booking.error.ts

export const BookingErrorCode = {
  BOOKING_NOT_FOUND: "BOOKING_NOT_FOUND",
  BOOKING_INVALID_STATE: "BOOKING_INVALID_STATE",
  BOOKING_ALREADY_EXISTS: "BOOKING_ALREADY_EXISTS",

  INVALID_BOOKING_DATE: "INVALID_BOOKING_DATE",
  BOOKING_SLOT_CONFLICT: "BOOKING_SLOT_CONFLICT",

  SERVICE_NOT_FOUND: "SERVICE_NOT_FOUND",
  SERVICE_NOT_ACTIVE: "SERVICE_NOT_ACTIVE",
  SERVICE_NOT_BOOKABLE: "SERVICE_NOT_BOOKABLE",

  UNAUTHORIZED_BOOKING: "UNAUTHORIZED_BOOKING",
  UNAUTHORIZED_SERVICE: "UNAUTHORIZED_SERVICE",
  UNAUTHORIZED: "UNAUTHORIZED",
  UNAUTHENTICATED: "UNAUTHENTICATED",
} as const;

export type BookingErrorCode =
  (typeof BookingErrorCode)[keyof typeof BookingErrorCode];

const STATUS_BY_CODE: Record<BookingErrorCode, number> = {
  BOOKING_NOT_FOUND: 404,
  SERVICE_NOT_FOUND: 404,

  BOOKING_ALREADY_EXISTS: 409,
  BOOKING_SLOT_CONFLICT: 409,

  BOOKING_INVALID_STATE: 422,
  INVALID_BOOKING_DATE: 422,
  SERVICE_NOT_ACTIVE: 422,
  SERVICE_NOT_BOOKABLE: 422,

  UNAUTHORIZED_BOOKING: 403,
  UNAUTHORIZED_SERVICE: 403,
  UNAUTHORIZED: 403,
  UNAUTHENTICATED: 401,
};

export class BookingError extends Error {
  public readonly code: BookingErrorCode;
  public readonly statusCode: number;

  constructor(code: BookingErrorCode, message: string, statusCode?: number) {
    super(message);
    this.name = "BookingError";
    this.code = code;
    this.statusCode = statusCode ?? STATUS_BY_CODE[code] ?? 400;
    Object.setPrototypeOf(this, BookingError.prototype);
  }

  toJSON() {
    return {
      code: this.code,
      message: this.message,
      statusCode: this.statusCode,
    };
  }
}