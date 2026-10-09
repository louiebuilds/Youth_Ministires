import type {
  CommunicationAudienceType,
  CommunicationChannel,
  CommunicationStatus,
} from "@/lib/supabase/database.types";

export type CommunicationActionState = {
  success: boolean;
  message?: string;
  sentCount?: number;
  failedCount?: number;
  suppressedCount?: number;
};

export type Announcement = {
  announcementId: string;
  title: string;
  messageBody: string;
  audienceType: CommunicationAudienceType;
  publishedAt: string | null;
  expiresAt: string | null;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
  canManage: boolean;
};

export type AnnouncementListResult =
  | { success: true; announcements: Announcement[] }
  | { success: false };

export type CommunicationTemplate = {
  templateId: string;
  name: string;
  channel: CommunicationChannel;
  subject: string | null;
  messageBody: string;
  archivedAt: string | null;
  updatedAt: string;
};

export type CommunicationRecipientPreview = {
  recipientProfileId: string;
  displayName: string;
  destinationMasked: string | null;
  preferenceAuthorized: boolean;
  suppressionReason: string | null;
};

export type CommunicationHistoryEntry = {
  communicationId: string;
  title: string;
  channel: CommunicationChannel;
  audienceType: CommunicationAudienceType;
  communicationStatus: CommunicationStatus;
  sentAt: string | null;
  deliveredCount: number;
  sentCount: number;
  failedCount: number;
  suppressedCount: number;
  syntheticDelivery: boolean;
  deliveryMode: "synthetic" | "live";
  providerName: string | null;
};

export type LiveEmailRecipientPreview = CommunicationRecipientPreview & {
  liveSendAllowed: boolean;
};

export type LiveSmsRecipientPreview = CommunicationRecipientPreview & {
  liveSendAllowed: boolean;
};

export type InAppNotification = {
  notificationId: string;
  title: string;
  messageBody: string;
  readAt: string | null;
  createdAt: string;
};
