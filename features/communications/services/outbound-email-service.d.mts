import type {
  EmailProvider,
  OutboundEmailMessage,
  OutboundEmailResult,
} from "../providers/email-provider";

export function submitOutboundEmail(
  provider: EmailProvider,
  message: OutboundEmailMessage,
): Promise<OutboundEmailResult>;
