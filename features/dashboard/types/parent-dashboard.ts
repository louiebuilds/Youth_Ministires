export type ParentDashboardData = Readonly<{
  announcements: readonly Readonly<{
    announcementId: string;
    audienceLabel: string;
    publishedAt: string;
    title: string;
  }>[];
  attentionItems: readonly Readonly<{
    detail: string;
    href: string;
    title: string;
  }>[];
  families: readonly Readonly<{
    children: readonly Readonly<{
      displayName: string;
      grade: string;
      studentId: string;
    }>[];
    householdId: string;
    householdName: string;
  }>[];
  upcomingEvents: readonly Readonly<{
    eventId: string;
    eventName: string;
    registrations: readonly Readonly<{
      status: string;
      studentName: string;
    }>[];
    startsAt: string;
    timezone: string;
  }>[];
  volunteer: Readonly<{
    assignments: readonly Readonly<{
      assignmentId: string;
      eventName: string;
      role: string;
      startsAt: string;
      status: string;
      timezone: string;
    }>[];
    profileId: string;
  }> | null;
}>;
