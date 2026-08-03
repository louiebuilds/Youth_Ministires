import type {
  CommunicationAudienceType,
  CommunicationChannel,
  CommunicationStatus,
} from "@/lib/supabase/database.types";

export type CommunicationActionState = {
  success: boolean;
  message?: string;
};

export type Announcement = {
  announcementId: string;
  title: string;
  messageBody: string;
  audienceType: CommunicationAudienceType;
  publishedAt: string | null;
  expiresAt: string | null;
  archivedAt: string | null;
  canManage: boolean;
};

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
  suppressedCount: number;
  syntheticDelivery: boolean;
};

export type InAppNotification = {
  notificationId: string;
  title: string;
  messageBody: string;
  readAt: string | null;
  createdAt: string;
};
