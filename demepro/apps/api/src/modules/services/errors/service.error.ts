// apps/api/src/modules/services/errors/service.error.ts

export const ServiceErrorCode = {
  SERVICE_NOT_FOUND: "SERVICE_NOT_FOUND",
  SERVICE_SLUG_TAKEN: "SERVICE_SLUG_TAKEN",
  SERVICE_INVALID_STATE: "SERVICE_INVALID_STATE",

  SERVICE_IMAGE_NOT_FOUND: "SERVICE_IMAGE_NOT_FOUND",
  SERVICE_ZONE_NOT_FOUND: "SERVICE_ZONE_NOT_FOUND",
  AVAILABILITY_NOT_FOUND: "AVAILABILITY_NOT_FOUND",

  INVALID_PRICING_MODEL: "INVALID_PRICING_MODEL",
  INVALID_AVAILABILITY: "INVALID_AVAILABILITY",
  INVALID_SERVICE_ZONE: "INVALID_SERVICE_ZONE",

  PROFESSIONAL_NOT_FOUND: "PROFESSIONAL_NOT_FOUND",
  CATEGORY_NOT_FOUND: "CATEGORY_NOT_FOUND",

  UNAUTHORIZED_SERVICE: "UNAUTHORIZED_SERVICE",
  UNAUTHORIZED: "UNAUTHORIZED",
  UNAUTHENTICATED: "UNAUTHENTICATED",
} as const;

export type ServiceErrorCode =
  (typeof ServiceErrorCode)[keyof typeof ServiceErrorCode];

const STATUS_BY_CODE: Record<ServiceErrorCode, number> = {
  SERVICE_NOT_FOUND: 404,
  SERVICE_SLUG_TAKEN: 409,
  SERVICE_INVALID_STATE: 422,
  SERVICE_IMAGE_NOT_FOUND: 404,
  SERVICE_ZONE_NOT_FOUND: 404,
  AVAILABILITY_NOT_FOUND: 404,
  INVALID_PRICING_MODEL: 422,
  INVALID_AVAILABILITY: 422,
  INVALID_SERVICE_ZONE: 422,
  PROFESSIONAL_NOT_FOUND: 404,
  CATEGORY_NOT_FOUND: 404,
  UNAUTHORIZED_SERVICE: 403,
  UNAUTHORIZED: 403,
  UNAUTHENTICATED: 401,
};

export class ServiceError extends Error {
  public readonly code: ServiceErrorCode;
  public readonly statusCode: number;

  constructor(code: ServiceErrorCode, message: string, statusCode?: number) {
    super(message);
    this.name = "ServiceError";
    this.code = code;
    this.statusCode = statusCode ?? STATUS_BY_CODE[code] ?? 400;
    Object.setPrototypeOf(this, ServiceError.prototype);
  }

  toJSON() {
    return { code: this.code, message: this.message, statusCode: this.statusCode };
  }
}