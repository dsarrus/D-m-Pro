// apps/api/src/modules/notifications/providers/notification-provider.interface.ts

/* ================================================================
 * TYPES
 * ================================================================ */

export type NotificationChannel = "EMAIL" | "SMS" | "IN_APP";

export type SendEmailParams = {
  to: string;
  subject: string;
  html: string;
  text?: string;
  metadata?: Record<string, unknown>;
};

export type SendSmsParams = {
  to: string;
  body: string;
  metadata?: Record<string, unknown>;
};

export type SendResult = {
  providerRef: string;
  status: "SENT" | "FAILED";
  error?: string;
};

/* ================================================================
 * INTERFACES
 * ================================================================ */

export interface EmailProviderInterface {
  readonly name: string;
  send(params: SendEmailParams): Promise<SendResult>;
}

export interface SmsProviderInterface {
  readonly name: string;
  send(params: SendSmsParams): Promise<SendResult>;
}