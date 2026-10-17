export type HeaderNotificationType = "announcement" | "chat" | "notification";

export type HeaderNotification = {
  type: HeaderNotificationType;
  id: string;
  title: string;
  occurredAt: string | null;
  readAt: string | null;
  href: string;
};

export type NotificationActionState = { success: boolean; message?: string };
