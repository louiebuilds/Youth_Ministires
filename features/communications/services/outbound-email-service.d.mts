import type {
  EmailProvider,
  OutboundEmailMessage,
  OutboundEmailResult,
} from "../providers/email-provider";

export type OutboundEmailAuthorization =
  | {
      policy: "restricted";
      allowedRecipients: readonly string[];
    }
  | {
      policy: "ministry";
      approvedRecipient: string;
    };

export function submitOutboundEmail(
  provider: EmailProvider,
  message: OutboundEmailMessage,
  authorization: OutboundEmailAuthorization,
): Promise<OutboundEmailResult>;
