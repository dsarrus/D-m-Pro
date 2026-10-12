// apps/api/src/modules/notifications/errors/notification.error.ts

export const NotificationErrorCode = {
  NOTIFICATION_NOT_FOUND: "NOTIFICATION_NOT_FOUND",
  NOTIFICATION_ALREADY_READ: "NOTIFICATION_ALREADY_READ",
  INVALID_CHANNEL: "INVALID_CHANNEL",
  TEMPLATE_NOT_FOUND: "TEMPLATE_NOT_FOUND",
  SEND_FAILED: "SEND_FAILED",

  UNAUTHORIZED_NOTIFICATION: "UNAUTHORIZED_NOTIFICATION",
  UNAUTHORIZED: "UNAUTHORIZED",
  UNAUTHENTICATED: "UNAUTHENTICATED",
} as const;

export type NotificationErrorCode =
  (typeof NotificationErrorCode)[keyof typeof NotificationErrorCode];

const STATUS_BY_CODE: Record<NotificationErrorCode, number> = {
  NOTIFICATION_NOT_FOUND: 404,
  NOTIFICATION_ALREADY_READ: 409,
  INVALID_CHANNEL: 422,
  TEMPLATE_NOT_FOUND: 404,
  SEND_FAILED: 502,
  UNAUTHORIZED_NOTIFICATION: 403,
  UNAUTHORIZED: 403,
  UNAUTHENTICATED: 401,
};

export class NotificationError extends Error {
  public readonly code: NotificationErrorCode;
  public readonly statusCode: number;

  constructor(
    code: NotificationErrorCode,
    message: string,
    statusCode?: number,
  ) {
    super(message);
    this.name = "NotificationError";
    this.code = code;
    this.statusCode = statusCode ?? STATUS_BY_CODE[code] ?? 400;
    Object.setPrototypeOf(this, NotificationError.prototype);
  }

  toJSON() {
    return {
      code: this.code,
      message: this.message,
      statusCode: this.statusCode,
    };
  }
}