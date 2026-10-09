import "server-only";

import {
  getCommunicationsEmailEnvironment,
  getCommunicationsSmsEnvironment,
} from "@/config/env";
import type { EmailProvider } from "@/features/communications/providers/email-provider";
import { ResendEmailProvider } from "@/features/communications/providers/resend-email-provider";
import type { SmsProvider } from "@/features/communications/providers/sms-provider";
import { TwilioSmsProvider } from "@/features/communications/providers/twilio-sms-provider";
import { submitOutboundEmail } from "@/features/communications/services/outbound-email-service.mjs";
import { submitOutboundSms } from "@/features/communications/services/outbound-sms-service.mjs";
import { createClient } from "@/lib/supabase/server";

import type {
  AnnouncementListResult,
  CommunicationTemplate,
  CommunicationHistoryEntry,
  CommunicationRecipientPreview,
  InAppNotification,
  LiveEmailRecipientPreview,
  LiveSmsRecipientPreview,
} from "@/features/communications/types/communications";
import type {
  CommunicationAudienceType,
  CommunicationChannel,
} from "@/lib/supabase/database.types";

type AnnouncementListFailureCategory =
  | "authorization"
  | "validation_contract"
  | "unavailable"
  | "unexpected";

const safeErrorCode = (value: unknown) =>
  typeof value === "string" && /^[A-Za-z0-9_]{1,20}$/.test(value)
    ? value
    : "unknown";

function announcementListFailureCategory(
  code: string,
): AnnouncementListFailureCategory {
  if (code === "42501" || code === "PGRST301") return "authorization";
  if (code.startsWith("22") || code.startsWith("23") ||
    code === "42883" || code === "PGRST202") {
    return "validation_contract";
  }
  if (code.startsWith("08") || code.startsWith("53") ||
    code.startsWith("57") || code.startsWith("PGRST")) {
    return "unavailable";
  }
  return "unexpected";
}

function logAnnouncementListFailure(
  code: string,
  category: AnnouncementListFailureCategory,
) {
  console.error("Announcement list RPC failed", {
    operation: "list_announcements",
    code,
    category,
  });
}

type AnnouncementInput = {
  title: string;
  messageBody: string;
  audienceType: CommunicationAudienceType;
  expiresAt: string | null;
};

type AnnouncementProjectionRow = {
  announcement_id: string;
  title: string;
  message_body: string;
  audience_type: CommunicationAudienceType;
  published_at: string | null;
  expires_at: string | null;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
  can_manage: boolean;
};

export async function listAnnouncements(
  search: string | null,
  includeArchived: boolean,
): Promise<AnnouncementListResult> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("list_announcements", {
      p_search: search,
      p_include_archived: includeArchived,
    });
    if (error) {
      const code = safeErrorCode(error.code);
      logAnnouncementListFailure(code, announcementListFailureCategory(code));
      return { success: false };
    }
    return {
      success: true,
      announcements: (data as AnnouncementProjectionRow[] | null ?? []).map((item) => ({
        announcementId: item.announcement_id,
        title: item.title,
        messageBody: item.message_body,
        audienceType: item.audience_type,
        publishedAt: item.published_at,
        expiresAt: item.expires_at,
        archivedAt: item.archived_at,
        createdAt: item.created_at,
        updatedAt: item.updated_at,
        canManage: item.can_manage,
      })),
    };
  } catch {
    logAnnouncementListFailure("unknown", "unexpected");
    return { success: false };
  }
}

export async function createAnnouncement(input: AnnouncementInput) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_announcement", {
    p_title: input.title,
    p_message_body: input.messageBody,
    p_audience_type: input.audienceType,
    p_expires_at: input.expiresAt,
  });
  return error ? null : data;
}

export async function updateAnnouncement(
  announcementId: string,
  input: AnnouncementInput,
) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("update_announcement", {
    p_announcement_id: announcementId,
    p_title: input.title,
    p_message_body: input.messageBody,
    p_audience_type: input.audienceType,
    p_expires_at: input.expiresAt,
  });
  return !error;
}

export async function publishAnnouncement(announcementId: string) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("publish_announcement", {
    p_announcement_id: announcementId,
  });
  return !error;
}

export async function archiveAnnouncement(announcementId: string) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("archive_announcement", {
    p_announcement_id: announcementId,
  });
  return !error;
}

export async function listCommunicationTemplates(
  search: string | null,
  includeArchived: boolean,
): Promise<CommunicationTemplate[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("list_communication_templates", {
    p_search: search,
    p_include_archived: includeArchived,
  });
  if (error) return [];
  return (data ?? []).map((item) => ({
    templateId: item.template_id,
    name: item.name,
    channel: item.channel,
    subject: item.subject,
    messageBody: item.message_body,
    archivedAt: item.archived_at,
    updatedAt: item.updated_at,
  }));
}

type CommunicationTemplateInput = {
  name: string;
  channel: CommunicationChannel;
  subject: string | null;
  messageBody: string;
};

export async function createCommunicationTemplate(
  input: CommunicationTemplateInput,
) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_communication_template", {
    p_name: input.name,
    p_channel: input.channel,
    p_subject: input.subject,
    p_message_body: input.messageBody,
  });
  return error ? null : data;
}

export async function getCommunicationTemplate(templateId: string) {
  const templates = await listCommunicationTemplates(null, true);
  return templates.find((template) => template.templateId === templateId) ?? null;
}

export async function updateCommunicationTemplate(
  templateId: string,
  input: CommunicationTemplateInput,
) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("update_communication_template", {
    p_template_id: templateId,
    p_name: input.name,
    p_channel: input.channel,
    p_subject: input.subject,
    p_message_body: input.messageBody,
  });
  return !error;
}

export async function archiveCommunicationTemplate(templateId: string) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("archive_communication_template", {
    p_template_id: templateId,
  });
  return !error;
}

export async function previewCommunicationRecipients(input: {
  audienceType: "parents" | "volunteers";
  channel: CommunicationChannel;
}): Promise<CommunicationRecipientPreview[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc(
    "preview_communication_recipients",
    {
      p_audience_type: input.audienceType,
      p_channel: input.channel,
    },
  );
  if (error) return [];
  return (data ?? []).map((item) => ({
    recipientProfileId: item.recipient_profile_id,
    displayName: item.display_name,
    destinationMasked: item.destination_masked,
    preferenceAuthorized: item.preference_authorized,
    suppressionReason: item.suppression_reason,
  }));
}

export async function previewLiveEmailRecipients(input: {
  audienceType: "parents" | "volunteers";
  allowlist: readonly string[];
}): Promise<LiveEmailRecipientPreview[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("preview_live_email_recipients", {
    p_audience_type: input.audienceType,
    p_allowlist: [...input.allowlist],
  });
  if (error) return [];
  return (data ?? []).map((item) => ({
    recipientProfileId: item.recipient_profile_id,
    displayName: item.display_name,
    destinationMasked: item.destination_masked,
    preferenceAuthorized: item.preference_authorized,
    liveSendAllowed: item.live_send_allowed,
    suppressionReason: item.suppression_reason,
  }));
}

export async function previewLiveSmsRecipients(input: {
  audienceType: "parents" | "volunteers";
  allowlist: readonly string[];
}): Promise<LiveSmsRecipientPreview[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("preview_live_sms_recipients", {
    p_audience_type: input.audienceType,
    p_allowlist: [...input.allowlist],
  });
  if (error) return [];
  return (data ?? []).map((item) => ({
    recipientProfileId: item.recipient_profile_id,
    displayName: item.display_name,
    destinationMasked: item.destination_masked,
    preferenceAuthorized: item.preference_authorized,
    liveSendAllowed: item.live_send_allowed,
    suppressionReason: item.suppression_reason,
  }));
}

export async function sendSyntheticCommunication(input: {
  title: string;
  subject: string | null;
  messageBody: string;
  channel: CommunicationChannel;
  audienceType: "parents" | "volunteers";
  templateId: string | null;
}) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("send_synthetic_communication", {
    p_title: input.title,
    p_subject: input.subject,
    p_message_body: input.messageBody,
    p_channel: input.channel,
    p_audience_type: input.audienceType,
    p_template_id: input.templateId,
  });
  return error || !data
    ? { success: false as const }
    : { success: true as const, communicationId: data };
}

type LiveEmailInput = {
  title: string;
  subject: string;
  messageBody: string;
  audienceType: "parents" | "volunteers";
  templateId: string | null;
  idempotencyKey: string;
  confirmedRecipientCount: number;
};

export async function sendLiveEmailCommunication(
  input: LiveEmailInput,
  providerOverride?: EmailProvider,
) {
  const environment = getCommunicationsEmailEnvironment();
  if (!environment.liveEnabled || !environment.apiKey || !environment.fromEmail) {
    return {
      success: false as const,
      reason: environment.disabledReason ?? "Live email is not enabled.",
    };
  }

  const supabase = await createClient();
  const { data: communicationId, error: createError } = await supabase.rpc(
    "create_live_email_communication",
    {
      p_title: input.title,
      p_subject: input.subject,
      p_message_body: input.messageBody,
      p_audience_type: input.audienceType,
      p_template_id: input.templateId,
      p_allowlist: [...environment.allowlist],
      p_confirmed_recipient_count: input.confirmedRecipientCount,
      p_idempotency_key: input.idempotencyKey,
    },
  );
  if (createError || !communicationId) {
    return {
      success: false as const,
      reason: createError?.code === "42501"
        ? "This account is not authorized to send live email."
        : "The recipient confirmation is stale or the live email could not be created.",
    };
  }

  const provider = providerOverride ?? new ResendEmailProvider(environment.apiKey);

  while (true) {
    const { data, error } = await supabase.rpc("claim_live_email_delivery", {
      p_communication_id: communicationId,
    });
    if (error) {
      return { success: false as const, reason: "A live email delivery could not be claimed." };
    }
    const delivery = data?.[0];
    if (!delivery) break;

    const result = await submitOutboundEmail(provider, {
      to: delivery.email_address,
      subject: delivery.subject,
      text: delivery.message_body,
      fromEmail: environment.fromEmail,
      fromName: environment.fromName,
      replyTo: environment.replyToEmail ?? undefined,
      idempotencyKey: delivery.submission_key,
    });
    const { error: finalizeError } = await supabase.rpc(
      "finalize_live_email_delivery",
      {
        p_delivery_id: delivery.delivery_id,
        p_success: result.success,
        p_provider_reference: result.success ? result.providerReference : null,
        p_failure_reason: result.success ? null : result.message,
      },
    );
    if (finalizeError) {
      return {
        success: false as const,
        reason: "Provider submission occurred, but its status could not be finalized. Do not resend.",
      };
    }
  }

  const { data: totals, error: totalsError } = await supabase.rpc(
    "get_live_email_send_result",
    { p_communication_id: communicationId },
  );
  const summary = totals?.[0];
  if (totalsError || !summary) {
    return {
      success: false as const,
      reason: "The live email was processed, but its summary is unavailable. Do not resend.",
    };
  }
  if (Number(summary.pending_count) > 0) {
    return {
      success: false as const,
      reason: "This live email operation is already in progress. Do not resend.",
    };
  }

  return {
    success: true as const,
    communicationId,
    sentCount: Number(summary.sent_count),
    failedCount: Number(summary.failed_count),
    suppressedCount: Number(summary.suppressed_count),
  };
}

type LiveSmsInput = {
  title: string;
  messageBody: string;
  audienceType: "parents" | "volunteers";
  templateId: string | null;
  idempotencyKey: string;
  confirmedRecipientCount: number;
};

export async function sendLiveSmsCommunication(
  input: LiveSmsInput,
  providerOverride?: SmsProvider,
) {
  const environment = getCommunicationsSmsEnvironment();
  if (!environment.liveEnabled || !environment.accountSid ||
      !environment.authToken ||
      (!environment.fromPhoneNumber && !environment.messagingServiceSid)) {
    return {
      success: false as const,
      reason: environment.disabledReason ?? "Live SMS is not enabled.",
    };
  }

  const supabase = await createClient();
  const { data: communicationId, error: createError } = await supabase.rpc(
    "create_live_sms_communication",
    {
      p_title: input.title,
      p_message_body: input.messageBody,
      p_audience_type: input.audienceType,
      p_template_id: input.templateId,
      p_allowlist: [...environment.allowlist],
      p_confirmed_recipient_count: input.confirmedRecipientCount,
      p_idempotency_key: input.idempotencyKey,
    },
  );
  if (createError || !communicationId) {
    return {
      success: false as const,
      reason: createError?.code === "42501"
        ? "This account is not authorized to send live SMS."
        : "The recipient confirmation is stale or the live SMS could not be created.",
    };
  }

  const provider = providerOverride ?? new TwilioSmsProvider(
    environment.accountSid,
    environment.authToken,
  );

  while (true) {
    const { data, error } = await supabase.rpc("claim_live_sms_delivery", {
      p_communication_id: communicationId,
    });
    if (error) {
      return {
        success: false as const,
        reason: "A live SMS delivery could not be claimed.",
      };
    }
    const delivery = data?.[0];
    if (!delivery) break;

    const result = await submitOutboundSms(provider, {
      to: delivery.phone_number,
      text: delivery.message_body,
      fromPhoneNumber: environment.fromPhoneNumber ?? undefined,
      messagingServiceSid: environment.messagingServiceSid ?? undefined,
      idempotencyKey: delivery.submission_key,
    });
    const { error: finalizeError } = await supabase.rpc(
      "finalize_live_sms_delivery",
      {
        p_delivery_id: delivery.delivery_id,
        p_success: result.success,
        p_provider_reference: result.success ? result.providerReference : null,
        p_failure_reason: result.success ? null : result.message,
      },
    );
    if (finalizeError) {
      return {
        success: false as const,
        reason: "Provider submission occurred, but its status could not be finalized. Do not resend.",
      };
    }
  }

  const { data: totals, error: totalsError } = await supabase.rpc(
    "get_live_sms_send_result",
    { p_communication_id: communicationId },
  );
  const summary = totals?.[0];
  if (totalsError || !summary) {
    return {
      success: false as const,
      reason: "The live SMS was processed, but its summary is unavailable. Do not resend.",
    };
  }
  if (Number(summary.pending_count) > 0) {
    return {
      success: false as const,
      reason: "This live SMS operation is already in progress. Do not resend.",
    };
  }

  return {
    success: true as const,
    communicationId,
    sentCount: Number(summary.sent_count),
    failedCount: Number(summary.failed_count),
    suppressedCount: Number(summary.suppressed_count),
  };
}

export async function listCommunicationHistory(
  search: string | null,
): Promise<CommunicationHistoryEntry[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("list_communication_history", {
    p_search: search,
  });
  if (error) return [];
  return (data ?? []).map((item) => ({
    communicationId: item.communication_id,
    title: item.title,
    channel: item.channel,
    audienceType: item.audience_type,
    communicationStatus: item.communication_status,
    sentAt: item.sent_at,
    deliveredCount: Number(item.delivered_count),
    sentCount: Number(item.sent_count),
    failedCount: Number(item.failed_count),
    suppressedCount: Number(item.suppressed_count),
    syntheticDelivery: item.synthetic_delivery,
    deliveryMode: item.delivery_mode as "synthetic" | "live",
    providerName: item.provider_name,
  }));
}

export async function listMyInAppNotifications(): Promise<InAppNotification[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("list_my_in_app_notifications");
  if (error) return [];
  return (data ?? []).map((item) => ({
    notificationId: item.notification_id,
    title: item.title,
    messageBody: item.message_body,
    readAt: item.read_at,
    createdAt: item.created_at,
  }));
}

export async function getMyUnreadNotificationCount() {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc(
    "get_my_unread_notification_count",
  );
  return error ? 0 : data;
}

export async function markMyNotificationRead(notificationId: string) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("mark_my_notification_read", {
    p_notification_id: notificationId,
  });
  return !error;
}

export async function markAllMyNotificationsRead() {
  const supabase = await createClient();
  const { error } = await supabase.rpc("mark_all_my_notifications_read");
  return !error;
}
