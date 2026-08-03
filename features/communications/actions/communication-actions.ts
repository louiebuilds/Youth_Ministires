"use server";

import { revalidatePath } from "next/cache";

import {
  announcementDetailsSchema,
  announcementIdSchema,
  communicationTemplateIdSchema,
  communicationTemplateSchema,
  syntheticCommunicationSchema,
  notificationIdSchema,
} from "@/features/communications/schemas/announcement-schema";
import {
  archiveAnnouncement,
  archiveCommunicationTemplate,
  createAnnouncement,
  createCommunicationTemplate,
  publishAnnouncement,
  updateAnnouncement,
  updateCommunicationTemplate,
  sendSyntheticCommunication,
  markAllMyNotificationsRead,
  markMyNotificationRead,
} from "@/features/communications/services/communication-service";

import type { CommunicationActionState } from "@/features/communications/types/communications";

export async function saveAnnouncementAction(
  _state: CommunicationActionState,
  formData: FormData,
): Promise<CommunicationActionState> {
  const parsed = announcementDetailsSchema.safeParse(
    Object.fromEntries(formData),
  );
  if (!parsed.success || parsed.data.expiresAt === "invalid") {
    return { success: false, message: "Review the announcement details." };
  }
  const { announcementId, ...input } = parsed.data;
  const saved = announcementId
    ? await updateAnnouncement(announcementId, input)
    : await createAnnouncement(input);
  if (!saved) {
    return { success: false, message: "The announcement could not be saved." };
  }
  revalidatePath("/communications");
  return {
    success: true,
    message: announcementId ? "Announcement updated." : "Draft created.",
  };
}

export async function publishAnnouncementAction(
  _state: CommunicationActionState,
  formData: FormData,
): Promise<CommunicationActionState> {
  const parsed = announcementIdSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success ||
    !await publishAnnouncement(parsed.data.announcementId)) {
    return { success: false, message: "The announcement was not published." };
  }
  revalidatePath("/communications");
  return { success: true, message: "Announcement published." };
}

export async function archiveAnnouncementAction(
  _state: CommunicationActionState,
  formData: FormData,
): Promise<CommunicationActionState> {
  const parsed = announcementIdSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success ||
    !await archiveAnnouncement(parsed.data.announcementId)) {
    return { success: false, message: "The announcement was not archived." };
  }
  revalidatePath("/communications");
  return { success: true, message: "Announcement archived." };
}

export async function saveCommunicationTemplateAction(
  _state: CommunicationActionState,
  formData: FormData,
): Promise<CommunicationActionState> {
  const parsed = communicationTemplateSchema.safeParse(
    Object.fromEntries(formData),
  );
  if (!parsed.success) {
    return { success: false, message: "Review the template details." };
  }
  const { templateId, ...input } = parsed.data;
  const saved = templateId
    ? await updateCommunicationTemplate(templateId, input)
    : await createCommunicationTemplate(input);
  if (!saved) {
    return { success: false, message: "The template could not be saved." };
  }
  revalidatePath("/communications/templates");
  return {
    success: true,
    message: templateId ? "Template updated." : "Template created.",
  };
}

export async function archiveCommunicationTemplateAction(
  _state: CommunicationActionState,
  formData: FormData,
): Promise<CommunicationActionState> {
  const parsed = communicationTemplateIdSchema.safeParse(
    Object.fromEntries(formData),
  );
  if (!parsed.success ||
    !await archiveCommunicationTemplate(parsed.data.templateId)) {
    return { success: false, message: "The template was not archived." };
  }
  revalidatePath("/communications/templates");
  return { success: true, message: "Template archived." };
}

export async function sendSyntheticCommunicationAction(
  _state: CommunicationActionState,
  formData: FormData,
): Promise<CommunicationActionState> {
  const parsed = syntheticCommunicationSchema.safeParse(
    Object.fromEntries(formData),
  );
  if (!parsed.success) {
    return { success: false, message: "Review the communication details." };
  }
  const result = await sendSyntheticCommunication(parsed.data);
  if (!result.success) {
    return { success: false, message: "The synthetic delivery failed." };
  }
  revalidatePath("/communications");
  revalidatePath("/communications/compose");
  return {
    success: true,
    message: "Synthetic delivery completed and audited. No real message was sent.",
  };
}

export async function markNotificationReadAction(
  _state: CommunicationActionState,
  formData: FormData,
): Promise<CommunicationActionState> {
  const parsed = notificationIdSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success ||
    !await markMyNotificationRead(parsed.data.notificationId)) {
    return { success: false, message: "The notification was not updated." };
  }
  revalidatePath("/communications");
  return { success: true, message: "Notification marked as read." };
}

export async function markAllNotificationsReadAction(
  state: CommunicationActionState,
): Promise<CommunicationActionState> {
  void state;
  if (!await markAllMyNotificationsRead()) {
    return { success: false, message: "Notifications were not updated." };
  }
  revalidatePath("/communications");
  return { success: true, message: "All notifications marked as read." };
}
