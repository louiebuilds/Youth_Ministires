import Link from "next/link";
import {
  ArrowRight,
  BellRing,
  CalendarDays,
  ClipboardCheck,
  UserRoundCheck,
} from "lucide-react";

import type { VolunteerDashboardData } from "@/features/dashboard/types/volunteer-dashboard";

type VolunteerDashboardProps = Readonly<{
  data: VolunteerDashboardData;
}>;

const displayDateTime = (value: string, timezone: string) =>
  new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: timezone,
  }).format(new Date(value));

const titleCase = (value: string) =>
  value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());

export function VolunteerDashboard({ data }: VolunteerDashboardProps) {
  const awaitingResponse = data.assignments.filter((assignment) => assignment.status === "assigned").length;

  return (
    <div className="space-y-8">
      <section className="overflow-hidden rounded-2xl bg-slate-950 px-6 py-7 text-white shadow-sm sm:px-8">
        <p className="text-sm font-semibold text-emerald-300">Volunteer dashboard</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">Your ministry service at a glance</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">
          Review upcoming assignments, items awaiting your response, forms, and ministry announcements.
        </p>
      </section>

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

      <div className="grid gap-6 xl:grid-cols-2">
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
              {data.assignments.map((assignment) => (
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

        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-950">Announcements</h2>
              <p className="mt-1 text-sm text-slate-600">Published updates available to your account.</p>
            </div>
            <BellRing aria-hidden="true" className="size-5 text-sky-700" />
          </div>
          {data.announcements.length ? (
            <ul className="mt-5 space-y-4">
              {data.announcements.map((announcement) => (
                <li key={announcement.announcementId}>
                  <Link className="font-semibold text-slate-950 hover:text-sky-800" href="/communications">
                    {announcement.title}
                  </Link>
                  <p className="mt-1 text-xs text-slate-600">
                    {announcement.audienceLabel} · {new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(new Date(announcement.publishedAt))}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-5 rounded-lg bg-slate-50 p-4 text-sm text-slate-600">No current announcements.</p>
          )}
        </section>
      </div>

      <section aria-labelledby="volunteer-actions-heading">
        <h2 className="text-lg font-semibold text-slate-950" id="volunteer-actions-heading">Quick actions</h2>
        <p className="mt-1 text-sm text-slate-600">
          {data.unreadNotifications > 0 ? `${data.unreadNotifications} unread notification${data.unreadNotifications === 1 ? "" : "s"}.` : "Go directly to common volunteer workspaces."}
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { href: data.volunteerProfileId ? `/volunteers/${data.volunteerProfileId}` : "/dashboard", label: "My Volunteer", description: "Review your availability, skills, and assignments." },
            { href: "/scheduling", label: "Scheduling", description: "Review schedules available to your account." },
            { href: "/permission-forms", label: "My Forms", description: "Complete assigned volunteer forms." },
            { href: "/communications", label: "Communications", description: "Read announcements and notifications." },
          ].map((action) => (
            <Link className="group rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-sky-300 hover:bg-sky-50" href={action.href} key={action.label}>
              <span className="flex items-center justify-between gap-3 font-semibold text-slate-950">
                {action.label}<ArrowRight aria-hidden="true" className="size-4 text-sky-700" />
              </span>
              <span className="mt-2 block text-sm leading-6 text-slate-600">{action.description}</span>
            </Link>
          ))}
        </div>
      </section>
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
