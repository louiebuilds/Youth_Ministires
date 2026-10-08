import "server-only";

export type OutboundEmailMessage = {
  to: string;
  subject: string;
  text: string;
  fromEmail: string;
  fromName?: string;
  replyTo?: string;
  idempotencyKey: string;
};

export type OutboundEmailResult =
  | { success: true; provider: string; providerReference: string }
  | {
      success: false;
      provider: string;
      classification: "configuration" | "validation" | "rate_limit" | "provider" | "network";
      message: string;
    };

export interface EmailProvider {
  readonly name: string;
  send(message: OutboundEmailMessage): Promise<OutboundEmailResult>;
}
