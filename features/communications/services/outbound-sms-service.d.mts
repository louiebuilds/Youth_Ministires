import type {
  OutboundSmsMessage,
  OutboundSmsResult,
  SmsProvider,
} from "@/features/communications/providers/sms-provider";

export function submitOutboundSms(
  provider: SmsProvider,
  message: OutboundSmsMessage,
): Promise<OutboundSmsResult>;
