import "server-only";

import { Resend } from "resend";

import type {
  EmailProvider,
  OutboundEmailMessage,
  OutboundEmailResult,
} from "@/features/communications/providers/email-provider";

const safeProviderMessage = (code?: string) => {
  if (code === "rate_limit_exceeded") return "The email provider rate limit was reached.";
  if (code === "validation_error" || code === "invalid_parameter" ||
      code === "invalid_from_address") {
    return "The email provider rejected the message configuration.";
  }
  return "The email provider did not accept the message.";
};

export class ResendEmailProvider implements EmailProvider {
  readonly name = "resend";
  private readonly client: Resend;

  constructor(apiKey: string) {
    this.client = new Resend(apiKey);
  }

  async send(message: OutboundEmailMessage): Promise<OutboundEmailResult> {
    try {
      const { data, error } = await this.client.emails.send({
        from: message.fromName
          ? `${message.fromName} <${message.fromEmail}>`
          : message.fromEmail,
        to: message.to,
        subject: message.subject,
        text: message.text,
        replyTo: message.replyTo,
      }, { idempotencyKey: message.idempotencyKey });

      if (error || !data?.id) {
        const code = error?.name;
        return {
          success: false,
          provider: this.name,
          classification: code === "rate_limit_exceeded"
            ? "rate_limit"
            : code?.includes("validation") || code?.includes("parameter")
              ? "validation"
              : "provider",
          message: safeProviderMessage(code),
        };
      }

      return {
        success: true,
        provider: this.name,
        providerReference: data.id,
      };
    } catch {
      return {
        success: false,
        provider: this.name,
        classification: "network",
        message: "The email provider could not be reached.",
      };
    }
  }
}
