// apps/api/src/modules/notifications/providers/email-provider.factory.ts

import type { EmailProviderInterface } from "./notification-provider.interface";
import { MockEmailProvider } from "./mock-email.provider";

/* ================================================================
 * SINGLETON
 * ================================================================ */

let instance: EmailProviderInterface | null = null;

export function getEmailProvider(): EmailProviderInterface {
  if (!instance) {
    const providerName = process.env.EMAIL_PROVIDER ?? "mock";

    switch (providerName) {
      case "mock":
      default:
        instance = new MockEmailProvider();
        break;

      /* Ajouter plus tard :
      case "sendgrid":
        instance = new SendgridProvider();
        break;
      */
    }
  }

  return instance;
}