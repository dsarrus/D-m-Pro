// apps/api/src/modules/notifications/providers/mock-email.provider.ts

import type {
  EmailProviderInterface,
  SendEmailParams,
  SendResult,
} from "./notification-provider.interface";

export class MockEmailProvider implements EmailProviderInterface {
  public readonly name = "mock-email";

  async send(params: SendEmailParams): Promise<SendResult> {
    /* En dev/test, on log simplement */
    console.log("📧 [MockEmailProvider] Email envoyé:");
    console.log("   To:", params.to);
    console.log("   Subject:", params.subject);
    console.log("   Text:", params.text?.slice(0, 200));

    return {
      providerRef: `mock-email_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      status: "SENT",
    };
  }
}