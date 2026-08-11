import type { MinistryDashboardData } from "@/features/dashboard/types/ministry-dashboard";

export const syntheticMinistryDashboard: MinistryDashboardData = {
  audience: "ministry",
  dataSource: "synthetic",
  announcements: [
    {
      audience: "All ministry families",
      publishedLabel: "Today",
      title: "Example weekly ministry update",
    },
    {
      audience: "Event volunteers",
      publishedLabel: "Yesterday",
      title: "Sample retreat volunteer briefing",
    },
  ],
  birthdays: [
    {
      dateLabel: "Today",
      displayName: "Jordan S.",
    },
    {
      dateLabel: "Tomorrow",
      displayName: "Taylor R.",
    },
    {
      dateLabel: "In 3 days",
      displayName: "Morgan L.",
    },
  ],
  metrics: [
    {
      detail: "12 more than last week",
      label: "Attendance this week",
      tone: "sky",
      value: "86",
    },
    {
      detail: "3 events in the next 14 days",
      label: "Upcoming events",
      tone: "violet",
      value: "5",
    },
    {
      detail: "4 assignments still needed",
      label: "Volunteer coverage",
      tone: "emerald",
      value: "18 / 22",
    },
    {
      detail: "2 awaiting staff review",
      label: "New registrations",
      tone: "amber",
      value: "7",
    },
    {
      detail: "3 need follow-up",
      label: "Prayer requests",
      tone: "rose",
      value: "6",
    },
    {
      detail: "Within the next 7 days",
      label: "Birthdays",
      tone: "slate",
      value: "4",
    },
  ],
  prayerRequestSummary: {
    confidentialCount: 2,
    followUpCount: 3,
    newCount: 6,
  },
  quickActions: [
    {
      description: "Open the attendance workspace.",
      href: "/attendance",
      label: "Take attendance",
    },
    {
      description: "Prepare for student arrivals.",
      href: "/check-in",
      label: "Start check-in",
    },
    {
      description: "Review the ministry calendar.",
      href: "/events",
      label: "View events",
    },
    {
      description: "Prepare a family update.",
      href: "/communications",
      label: "Create announcement",
    },
  ],
  upcomingEvents: [
    {
      dateLabel: "Jul 29",
      name: "Example Midweek Gathering",
      registrationLabel: "32 registered",
      timeLabel: "6:30 PM",
    },
    {
      dateLabel: "Aug 2",
      name: "Sample Service Project",
      registrationLabel: "18 registered",
      timeLabel: "9:00 AM",
    },
    {
      dateLabel: "Aug 8",
      name: "Demo Summer Retreat",
      registrationLabel: "41 registered",
      timeLabel: "4:00 PM",
    },
  ],
  volunteerStatus: {
    confirmed: 18,
    needed: 4,
    pending: 3,
  },
};

export const syntheticFamilyDashboard: MinistryDashboardData = {
  audience: "family",
  dataSource: "synthetic",
  announcements: [
    {
      audience: "All ministry families",
      publishedLabel: "Today",
      title: "Example weekly ministry update",
    },
    {
      audience: "Registered families",
      publishedLabel: "Yesterday",
      title: "Sample summer retreat reminder",
    },
  ],
  birthdays: [],
  metrics: [
    {
      detail: "Published activities open to your household",
      label: "Upcoming events",
      tone: "violet",
      value: "3",
    },
    {
      detail: "One sample form is awaiting completion",
      label: "Forms needing attention",
      tone: "amber",
      value: "1",
    },
    {
      detail: "Fictional registrations for your household",
      label: "Active registrations",
      tone: "emerald",
      value: "2",
    },
    {
      detail: "Updates shared with ministry families",
      label: "New announcements",
      tone: "sky",
      value: "2",
    },
  ],
  prayerRequestSummary: {
    confidentialCount: 0,
    followUpCount: 0,
    newCount: 0,
  },
  quickActions: [
    {
      description: "Review your household information.",
      href: "/families",
      label: "View family",
    },
    {
      description: "Review students related to your household.",
      href: "/students",
      label: "View students",
    },
    {
      description: "See published ministry activities.",
      href: "/events",
      label: "View events",
    },
    {
      description: "Review forms related to your household.",
      href: "/permission-forms",
      label: "View permission forms",
    },
  ],
  upcomingEvents: [
    {
      dateLabel: "Jul 29",
      name: "Example Midweek Gathering",
      registrationLabel: "Registration open",
      timeLabel: "6:30 PM",
    },
    {
      dateLabel: "Aug 2",
      name: "Sample Service Project",
      registrationLabel: "Household eligible",
      timeLabel: "9:00 AM",
    },
    {
      dateLabel: "Aug 8",
      name: "Demo Summer Retreat",
      registrationLabel: "Registration submitted",
      timeLabel: "4:00 PM",
    },
  ],
  volunteerStatus: {
    confirmed: 0,
    needed: 0,
    pending: 0,
  },
};
