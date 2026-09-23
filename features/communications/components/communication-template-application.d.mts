import type { CommunicationTemplate } from "@/features/communications/types/communications";
import type { CommunicationChannel } from "@/lib/supabase/database.types";

type AppliedContent = { subject: string; messageBody: string } | null;

type ApplicationInput = {
  templates: CommunicationTemplate[];
  templateId: string;
  channel: CommunicationChannel;
  subject: string;
  messageBody: string;
  appliedContent: AppliedContent;
  allowManualReplacement?: boolean;
};

type ApplicationResult =
  | { kind: "invalid" | "confirmation_required" }
  | {
      kind: "applied";
      selectedTemplateId: string;
      subject: string;
      messageBody: string;
      appliedContent: AppliedContent;
    };

export function resolveTemplateApplication(
  input: ApplicationInput,
): ApplicationResult;
