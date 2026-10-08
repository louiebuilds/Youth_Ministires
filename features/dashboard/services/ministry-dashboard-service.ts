import "server-only";

import { listAnnouncements } from "@/features/communications/services/communication-service";
import { listEventCalendar } from "@/features/events/services/event-management-service";
import { getReportingOverview } from "@/features/reporting/services/reporting-service";
import { createClient } from "@/lib/supabase/server";

import type { MinistryDashboardData } from "@/features/dashboard/types/ministry-dashboard";

type BirthdayRow = {
  birthday_date: string;
  display_name: string;
  student_id: string;
};

type PrayerCareSummary = {
  activeCount: number;
  followUpCount: number;
  privateCount: number;
};

async function listUpcomingBirthdays() {
  const client = await createClient() as unknown as {
    rpc(name: string, args: Record<string, unknown>): Promise<{
      data: BirthdayRow[] | null;
      error: { message: string } | null;
    }>;
  };
  const { data, error } = await client.rpc("list_upcoming_dashboard_birthdays", {
    p_days: 14,
  });
  if (error) return [];
  return data ?? [];
}

async function getPrayerCareSummary(): Promise<PrayerCareSummary> {
  const client = await createClient() as unknown as {
    rpc(name: string): Promise<{
      data: PrayerCareSummary | null;
      error: { message: string } | null;
    }>;
  };
  const { data, error } = await client.rpc("get_dashboard_prayer_care_summary");
  return error || !data
    ? { activeCount: 0, followUpCount: 0, privateCount: 0 }
    : data;
}

const audienceLabels = {
  event: "Event audience",
  household: "Household",
  individual: "Individual",
  ministry: "Entire ministry",
  parents: "Parents and guardians",
  volunteers: "Volunteers",
} as const;

export async function getLiveMinistryDashboard(): Promise<MinistryDashboardData> {
  const today = new Date();
  const thirtyDaysAgo = new Date(today);
  thirtyDaysAgo.setUTCDate(thirtyDaysAgo.getUTCDate() - 29);
  const ninetyDaysFromNow = new Date(today);
  ninetyDaysFromNow.setUTCDate(ninetyDaysFromNow.getUTCDate() + 90);

  const [overview, upcomingOverview, calendar, announcements, prayerCare, birthdays] =
    await Promise.all([
      getReportingOverview(
        thirtyDaysAgo.toISOString().slice(0, 10),
        today.toISOString().slice(0, 10),
      ),
      getReportingOverview(
        today.toISOString().slice(0, 10),
        ninetyDaysFromNow.toISOString().slice(0, 10),
      ),
      listEventCalendar({
        fromDate: today.toISOString().slice(0, 10),
        toDate: ninetyDaysFromNow.toISOString().slice(0, 10),
        search: null,
        status: null,
      }),
      listAnnouncements(null, false),
      getPrayerCareSummary(),
      listUpcomingBirthdays(),
    ]);

  return {
    audience: "ministry",
    dataSource: "live",
    metrics: [
      { label: "Unique youth attending", value: String(overview.uniqueYouth), detail: "Last 30 days · finalized present attendance", tone: "sky" },
      { label: "Upcoming events", value: String(overview.upcomingEvents), detail: "Published or active future events", tone: "violet" },
      { label: "Volunteer coverage", value: `${upcomingOverview.filledPositions} / ${upcomingOverview.requiredPositions}`, detail: `${upcomingOverview.coveragePercentage}% coverage in the next 90 days`, tone: "emerald" },
      { label: "Event registrations", value: String(overview.registrations), detail: "Last 30 days · separate from attendance", tone: "amber" },
      { label: "First-time participants", value: String(overview.firstTimeParticipants), detail: "First finalized attendance in the last 30 days", tone: "rose" },
      { label: "New youth added", value: String(overview.newYouthAdded), detail: "Student records created in the last 30 days", tone: "slate" },
    ],
    upcomingEvents: calendar.success
      ? calendar.events.slice(0, 5).map((event) => ({
          dateLabel: new Intl.DateTimeFormat("en-US", {
            month: "short",
            day: "numeric",
            timeZone: event.timezone,
          }).format(new Date(event.startsAt)),
          name: event.eventName,
          registrationLabel: event.eventStatus.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase()),
          timeLabel: new Intl.DateTimeFormat("en-US", {
            hour: "numeric",
            minute: "2-digit",
            timeZone: event.timezone,
          }).format(new Date(event.startsAt)),
        }))
      : [],
    volunteerStatus: {
      confirmed: upcomingOverview.filledPositions,
      needed: upcomingOverview.unfilledPositions,
      pending: Math.max(upcomingOverview.upcomingAssignments - upcomingOverview.filledPositions, 0),
    },
    prayerRequestSummary: {
      newCount: prayerCare.activeCount,
      followUpCount: prayerCare.followUpCount,
      confidentialCount: prayerCare.privateCount,
    },
    birthdays: birthdays.map((birthday) => ({
      displayName: birthday.display_name,
      dateLabel: new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" })
        .format(new Date(`${birthday.birthday_date}T12:00:00Z`)),
    })),
    announcements: announcements.success
      ? announcements.announcements.slice(0, 3).map((announcement) => ({
          title: announcement.title,
          audience: audienceLabels[announcement.audienceType],
          publishedLabel: new Intl.DateTimeFormat("en-US", { dateStyle: "medium" })
            .format(new Date(announcement.publishedAt ?? announcement.createdAt)),
        }))
      : [],
    quickActions: [
      { description: "Open the attendance workspace.", href: "/attendance", label: "Take attendance" },
      { description: "Prepare for student arrivals.", href: "/check-in", label: "Start check-in" },
      { description: "Review the ministry calendar.", href: "/events", label: "View events" },
      { description: "Prepare a ministry update.", href: "/communications", label: "Communications" },
    ],
  };
}
