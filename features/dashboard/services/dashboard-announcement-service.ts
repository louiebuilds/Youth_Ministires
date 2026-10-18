import "server-only";

import { listAnnouncements } from "@/features/communications/services/communication-service";
import { listHeaderNotifications } from "@/features/notifications/services/header-notification-service";
import type { DashboardAnnouncementSpotlight } from "@/features/dashboard/types/dashboard-home";

export async function getDashboardAnnouncementSpotlight(): Promise<
  DashboardAnnouncementSpotlight | null
> {
  const [notifications, announcements] = await Promise.all([
    listHeaderNotifications(),
    listAnnouncements(null, false),
  ]);
  const unread = notifications.filter(
    (item) => item.type === "announcement" && !item.readAt,
  );
  const first = unread[0];
  if (!first || !announcements.success) return null;
  const announcement = announcements.announcements.find(
    (item) => item.announcementId === first.id,
  );
  if (!announcement) return null;
  const normalized = announcement.messageBody.replaceAll(/\s+/gu, " ").trim();
  return {
    announcementId: announcement.announcementId,
    messagePreview: normalized.length > 180
      ? `${normalized.slice(0, 177).trimEnd()}…`
      : normalized,
    occurredAt: first.occurredAt,
    remainingCount: Math.max(0, unread.length - 1),
    title: announcement.title,
  };
}
