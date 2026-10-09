import "server-only";

import twilio, { type Twilio } from "twilio";

import type {
  OutboundSmsMessage,
  OutboundSmsResult,
  SmsProvider,
} from "@/features/communications/providers/sms-provider";

type TwilioFailure = {
  code?: number;
  status?: number;
};

function safeFailure(
  error: unknown,
): Extract<OutboundSmsResult, { success: false }> {
  const failure =
    typeof error === "object" && error !== null
      ? (error as TwilioFailure)
      : {};

  const classification =
    failure.status === 429 || failure.code === 20429
      ? "rate_limit"
      : failure.status && failure.status >= 400 && failure.status < 500
        ? "validation"
        : failure.status && failure.status >= 500
          ? "provider"
          : "network";

  const codeSuffix =
    typeof failure.code === "number"
      ? ` (Twilio code ${failure.code})`
      : "";

  return {
    success: false,
    provider: "twilio",
    classification,
    message:
      classification === "rate_limit"
        ? `The text messaging service rate limit was reached${codeSuffix}.`
        : classification === "validation"
          ? `The text messaging service rejected the message details${codeSuffix}.`
          : classification === "network"
            ? `The text messaging service could not be reached${codeSuffix}.`
            : `The text messaging service did not accept the message${codeSuffix}.`,
  };
}

export class TwilioSmsProvider implements SmsProvider {
  readonly name = "twilio";
  private readonly client: Twilio;

  constructor(accountSid: string, authToken: string) {
    this.client = twilio(accountSid, authToken);
  }

  async send(message: OutboundSmsMessage): Promise<OutboundSmsResult> {
    if (!message.fromPhoneNumber && !message.messagingServiceSid) {
      return {
        success: false,
        provider: this.name,
        classification: "configuration",
        message: "The text messaging sending identity is unavailable.",
      };
    }

    try {
      const result = await this.client.messages.create({
        body: message.text,
        to: message.to,
        ...(message.messagingServiceSid
          ? { messagingServiceSid: message.messagingServiceSid }
          : { from: message.fromPhoneNumber }),
      });

      if (!result.sid) {
        return {
          success: false,
          provider: this.name,
          classification: "provider",
          message: "The text messaging service did not accept the message.",
        };
      }

      return {
        success: true,
        provider: this.name,
        providerReference: result.sid,
      };
    } catch (error) {
      return safeFailure(error);
    }
  }
}