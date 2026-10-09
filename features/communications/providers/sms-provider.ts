import "server-only";

export type OutboundSmsMessage = {
  to: string;
  text: string;
  fromPhoneNumber?: string;
  messagingServiceSid?: string;
  idempotencyKey: string;
};

export type OutboundSmsResult =
  | { success: true; provider: string; providerReference: string }
  | {
      success: false;
      provider: string;
      classification: "configuration" | "validation" | "rate_limit" | "provider" | "network";
      message: string;
    };

export interface SmsProvider {
  readonly name: string;
  send(message: OutboundSmsMessage): Promise<OutboundSmsResult>;
}
