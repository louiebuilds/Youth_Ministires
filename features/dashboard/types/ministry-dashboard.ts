export type DashboardMetricTone =
  | "amber"
  | "emerald"
  | "rose"
  | "sky"
  | "slate"
  | "violet";

export type DashboardMetric = Readonly<{
  detail: string;
  label: string;
  tone: DashboardMetricTone;
  value: string;
}>;

export type DashboardEvent = Readonly<{
  dateLabel: string;
  name: string;
  registrationLabel: string;
  timeLabel: string;
}>;

export type DashboardAnnouncement = Readonly<{
  audience: string;
  publishedLabel: string;
  title: string;
}>;

export type DashboardBirthday = Readonly<{
  dateLabel: string;
  displayName: string;
}>;

export type DashboardQuickAction = Readonly<{
  description: string;
  href: string;
  label: string;
}>;

export type MinistryDashboardData = Readonly<{
  audience: "family" | "ministry";
  dataSource: "hybrid" | "synthetic";
  announcements: readonly DashboardAnnouncement[];
  birthdays: readonly DashboardBirthday[];
  metrics: readonly DashboardMetric[];
  prayerRequestSummary: Readonly<{
    confidentialCount: number;
    followUpCount: number;
    newCount: number;
  }>;
  quickActions: readonly DashboardQuickAction[];
  upcomingEvents: readonly DashboardEvent[];
  volunteerStatus: Readonly<{
    confirmed: number;
    needed: number;
    pending: number;
  }>;
}>;
