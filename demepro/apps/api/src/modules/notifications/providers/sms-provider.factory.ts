// apps/api/src/modules/notifications/providers/sms-provider.factory.ts

import type { SmsProviderInterface } from "./notification-provider.interface";
import { MockSmsProvider } from "./mock-sms.provider";

let instance: SmsProviderInterface | null = null;

export function getSmsProvider(): SmsProviderInterface {
  if (!instance) {
    const providerName = process.env.SMS_PROVIDER ?? "mock";

    switch (providerName) {
      case "mock":
      default:
        instance = new MockSmsProvider();
        break;

      /* Ajouter plus tard :
      case "twilio":
        instance = new TwilioProvider();
        break;
      */
    }
  }

  return instance;
}