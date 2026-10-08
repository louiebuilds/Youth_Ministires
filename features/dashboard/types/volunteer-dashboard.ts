export type VolunteerDashboardData = Readonly<{
  announcements: readonly Readonly<{
    announcementId: string;
    audienceLabel: string;
    publishedAt: string;
    title: string;
  }>[];
  assignments: readonly Readonly<{
    assignmentId: string;
    eventName: string;
    role: string;
    startsAt: string;
    status: string;
    timezone: string;
  }>[];
  formsNeedingAttention: number;
  unreadNotifications: number;
  volunteerProfileId: string | null;
}>;
