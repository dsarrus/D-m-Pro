// apps/api/src/modules/notifications/providers/mock-sms.provider.ts

import type {
  SmsProviderInterface,
  SendSmsParams,
  SendResult,
} from "./notification-provider.interface";

export class MockSmsProvider implements SmsProviderInterface {
  public readonly name = "mock-sms";

  async send(params: SendSmsParams): Promise<SendResult> {
    console.log("📱 [MockSmsProvider] SMS envoyé:");
    console.log("   To:", params.to);
    console.log("   Body:", params.body.slice(0, 160));

    return {
      providerRef: `mock-sms_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      status: "SENT",
    };
  }
}