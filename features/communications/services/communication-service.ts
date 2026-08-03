import "server-only";

import { createClient } from "@/lib/supabase/server";

import type {
  Announcement,
  CommunicationTemplate,
  CommunicationHistoryEntry,
  CommunicationRecipientPreview,
  InAppNotification,
} from "@/features/communications/types/communications";
import type {
  CommunicationAudienceType,
  CommunicationChannel,
} from "@/lib/supabase/database.types";

type AnnouncementInput = {
  title: string;
  messageBody: string;
  audienceType: CommunicationAudienceType;
  expiresAt: string | null;
};

export async function listAnnouncements(
  search: string | null,
  includeArchived: boolean,
): Promise<Announcement[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("list_announcements", {
    p_search: search,
    p_include_archived: includeArchived,
  });
  if (error) return [];
  return (data ?? []).map((item) => ({
    announcementId: item.announcement_id,
    title: item.title,
    messageBody: item.message_body,
    audienceType: item.audience_type,
    publishedAt: item.published_at,
    expiresAt: item.expires_at,
    archivedAt: item.archived_at,
    canManage: item.can_manage,
  }));
}

export async function createAnnouncement(input: AnnouncementInput) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("create_announcement", {
    p_title: input.title,
    p_message_body: input.messageBody,
    p_audience_type: input.audienceType,
    p_expires_at: input.expiresAt,
  });
  return !error;
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
  const { error } = await supabase.rpc("create_communication_template", {
    p_name: input.name,
    p_channel: input.channel,
    p_subject: input.subject,
    p_message_body: input.messageBody,
  });
  return !error;
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
    suppressedCount: Number(item.suppressed_count),
    syntheticDelivery: item.synthetic_delivery,
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
