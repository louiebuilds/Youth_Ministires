export type DashboardAnnouncementSpotlight = Readonly<{
  announcementId: string;
  messagePreview: string;
  occurredAt: string | null;
  remainingCount: number;
  title: string;
}>;

export type DashboardHomeAction = Readonly<{
  description: string;
  href: string;
  label: string;
}>;
