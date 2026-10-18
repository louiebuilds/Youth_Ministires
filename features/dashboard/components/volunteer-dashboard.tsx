import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  ClipboardCheck,
  UserRoundCheck,
} from "lucide-react";

import type { VolunteerDashboardData } from "@/features/dashboard/types/volunteer-dashboard";
import { DashboardHomeTop } from "@/features/dashboard/components/dashboard-home-top";
import type { DashboardAnnouncementSpotlight } from "@/features/dashboard/types/dashboard-home";

type VolunteerDashboardProps = Readonly<{
  data: VolunteerDashboardData;
  displayName: string;
  spotlight: DashboardAnnouncementSpotlight | null;
}>;

const displayDateTime = (value: string, timezone: string) =>
  new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: timezone,
  }).format(new Date(value));

const titleCase = (value: string) =>
  value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());

export function VolunteerDashboard({ data, displayName, spotlight }: VolunteerDashboardProps) {
  const awaitingResponse = data.assignments.filter((assignment) => assignment.status === "assigned").length;
  const quickActions = [
    { href: data.volunteerProfileId ? `/volunteers/${data.volunteerProfileId}` : "/dashboard", label: "My Volunteer", description: "Review your availability, skills, and assignments." },
    { href: "/scheduling", label: "Scheduling", description: "Review schedules available to your account." },
    { href: "/permission-forms", label: "My Forms", description: "Complete assigned volunteer forms." },
    { href: "/communications", label: "Communications", description: "Read announcements and notifications." },
  ];

  return (
    <div className="space-y-8">
      <DashboardHomeTop
        actions={quickActions}
        displayName={displayName}
        eyebrow="Volunteer dashboard"
        spotlight={spotlight}
        summary="Your next assignments and anything needing your attention are ready below."
      />

      <section className="grid gap-4 sm:grid-cols-3" aria-label="Volunteer summary">
        <SummaryCard icon={CalendarDays} label="Upcoming assignments" value={data.assignments.length} />
        <SummaryCard icon={UserRoundCheck} label="Awaiting response" value={awaitingResponse} />
        <SummaryCard icon={ClipboardCheck} label="Forms needing attention" value={data.formsNeedingAttention} />
      </section>

      {!data.volunteerProfileId ? (
        <section className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-amber-950">
          No active volunteer profile is connected to this account. Contact a ministry administrator or Youth Pastor for help.
        </section>
      ) : null}

      <div className="grid gap-6">
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-950">Upcoming assignments</h2>
              <p className="mt-1 text-sm text-slate-600">Your active event and scheduling assignments.</p>
            </div>
            <CalendarDays aria-hidden="true" className="size-5 text-emerald-700" />
          </div>
          {data.assignments.length ? (
            <ul className="mt-5 divide-y divide-slate-200">
              {data.assignments.slice(0, 3).map((assignment) => (
                <li className="py-4 first:pt-0 last:pb-0" key={assignment.assignmentId}>
                  <p className="font-semibold text-slate-950">{assignment.eventName}</p>
                  <p className="mt-1 text-sm text-slate-600">
                    {assignment.role} · {titleCase(assignment.status)}
                  </p>
                  <p className="mt-1 text-sm text-slate-600">
                    {displayDateTime(assignment.startsAt, assignment.timezone)}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-5 rounded-lg bg-slate-50 p-4 text-sm text-slate-600">No upcoming assignments.</p>
          )}
          {data.volunteerProfileId ? (
            <Link className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-sky-700" href={`/volunteers/${data.volunteerProfileId}`}>
              Open My Volunteer <ArrowRight aria-hidden="true" className="size-4" />
            </Link>
          ) : null}
        </section>

      </div>
    </div>
  );
}

function SummaryCard({ icon: Icon, label, value }: Readonly<{
  icon: typeof CalendarDays;
  label: string;
  value: number;
}>) {
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-600">{label}</p>
          <p className="mt-2 text-3xl font-bold text-slate-950">{value}</p>
        </div>
        <span className="rounded-lg bg-emerald-50 p-2.5 text-emerald-700"><Icon aria-hidden="true" className="size-5" /></span>
      </div>
    </article>
  );
}
