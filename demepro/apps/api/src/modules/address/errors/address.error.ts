// apps/api/src/modules/address/errors/address.error.ts

export const AddressErrorCode = {
  ADDRESS_NOT_FOUND: "ADDRESS_NOT_FOUND",
  ADDRESS_LIMIT_REACHED: "ADDRESS_LIMIT_REACHED",
  ADDRESS_ALREADY_DEFAULT: "ADDRESS_ALREADY_DEFAULT",
  ADDRESS_IS_DEFAULT: "ADDRESS_IS_DEFAULT",

  UNAUTHORIZED_ADDRESS: "UNAUTHORIZED_ADDRESS",
  UNAUTHORIZED: "UNAUTHORIZED",
  UNAUTHENTICATED: "UNAUTHENTICATED",
} as const;

export type AddressErrorCode =
  (typeof AddressErrorCode)[keyof typeof AddressErrorCode];

const STATUS_BY_CODE: Record<AddressErrorCode, number> = {
  ADDRESS_NOT_FOUND: 404,
  ADDRESS_LIMIT_REACHED: 422,
  ADDRESS_ALREADY_DEFAULT: 409,
  ADDRESS_IS_DEFAULT: 422,
  UNAUTHORIZED_ADDRESS: 403,
  UNAUTHORIZED: 403,
  UNAUTHENTICATED: 401,
};

export class AddressError extends Error {
  public readonly code: AddressErrorCode;
  public readonly statusCode: number;

  constructor(code: AddressErrorCode, message: string, statusCode?: number) {
    super(message);
    this.name = "AddressError";
    this.code = code;
    this.statusCode = statusCode ?? STATUS_BY_CODE[code] ?? 400;
    Object.setPrototypeOf(this, AddressError.prototype);
  }

  toJSON() {
    return {
      code: this.code,
      message: this.message,
      statusCode: this.statusCode,
    };
  }
}