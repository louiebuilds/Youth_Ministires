import Link from "next/link";
import {
  ArrowRight,
  BellRing,
  CalendarDays,
  ClipboardCheck,
  HeartHandshake,
  UserRoundCheck,
  UsersRound,
} from "lucide-react";

import type { ParentDashboardData } from "@/features/dashboard/types/parent-dashboard";

type ParentDashboardProps = Readonly<{
  data: ParentDashboardData;
}>;

const quickActions = [
  { href: "/families", label: "My family", description: "Review your linked household information." },
  { href: "/events", label: "Events", description: "View published activities and registrations." },
  { href: "/permission-forms", label: "Forms & medical", description: "Complete forms and review document status." },
  { href: "/family-check-in", label: "Family check-in", description: "Open your reusable family check-in pass." },
  { href: "/communications", label: "Communications", description: "Read ministry announcements and messages." },
] as const;

const displayDateTime = (value: string, timezone: string) =>
  new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: timezone,
  }).format(new Date(value));

const displayDate = (value: string) =>
  new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(new Date(value));

const titleCase = (value: string) =>
  value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());

export function ParentDashboard({ data }: ParentDashboardProps) {
  const youthCount = data.families.reduce((total, family) => total + family.children.length, 0);
  const registrationCount = data.upcomingEvents.reduce(
    (total, event) => total + event.registrations.length,
    0,
  );

  return (
    <div className="space-y-8">
      <section className="overflow-hidden rounded-2xl bg-slate-950 px-6 py-7 text-white shadow-sm sm:px-8">
        <p className="text-sm font-semibold text-sky-300">Family dashboard</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">
          Your family at a glance
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">
          See your linked youth, upcoming registrations, forms that need attention,
          and recent ministry updates.
        </p>
      </section>

      <section aria-labelledby="family-summary-heading">
        <div>
          <h2 className="text-lg font-semibold text-slate-950" id="family-summary-heading">
            My family
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Information is limited to youth connected to your account.
          </p>
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <SummaryCard icon={UsersRound} label="Linked youth" value={youthCount} />
          <SummaryCard icon={CalendarDays} label="Upcoming registrations" value={registrationCount} />
          <SummaryCard icon={ClipboardCheck} label="Forms needing attention" value={data.attentionItems.length} />
        </div>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          {data.families.map((family) => (
            <Link
              className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-sky-300"
              href={`/families/${family.householdId}`}
              key={family.householdId}
            >
              <div className="flex items-center justify-between gap-3">
                <h3 className="font-semibold text-slate-950">{family.householdName}</h3>
                <ArrowRight aria-hidden="true" className="size-4 text-sky-700" />
              </div>
              {family.children.length ? (
                <ul className="mt-3 space-y-2 text-sm text-slate-600">
                  {family.children.map((child) => (
                    <li className="flex justify-between gap-3" key={child.studentId}>
                      <span className="font-medium text-slate-800">{child.displayName}</span>
                      <span>{child.grade}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-3 text-sm text-slate-600">No linked youth are listed for this household.</p>
              )}
            </Link>
          ))}
          {!data.families.length ? (
            <EmptyState message="No family is linked to this account. Ask a ministry administrator or Youth Pastor for help." />
          ) : null}
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-2">
        <DashboardSection
          description="Registrations for your linked youth in the next 90 days."
          icon={CalendarDays}
          title="Upcoming registered events"
        >
          {data.upcomingEvents.length ? (
            <ul className="divide-y divide-slate-200">
              {data.upcomingEvents.map((event) => (
                <li className="py-4 first:pt-0 last:pb-0" key={event.eventId}>
                  <Link className="font-semibold text-slate-950 hover:text-sky-800" href={`/events/${event.eventId}`}>
                    {event.eventName}
                  </Link>
                  <p className="mt-1 text-sm text-slate-600">
                    {displayDateTime(event.startsAt, event.timezone)}
                  </p>
                  <p className="mt-2 text-sm text-slate-700">
                    {event.registrations.map((registration) =>
                      `${registration.studentName} · ${titleCase(registration.status)}`
                    ).join("; ")}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState message="No upcoming registrations were found for your linked youth." />
          )}
        </DashboardSection>

        <DashboardSection
          description="Incomplete or replacement forms connected to your family."
          icon={ClipboardCheck}
          title="Forms & medical attention"
        >
          {data.attentionItems.length ? (
            <ul className="space-y-3">
              {data.attentionItems.map((item) => (
                <li key={`${item.href}-${item.title}-${item.detail}`}>
                  <Link className="block rounded-lg bg-amber-50 p-3 hover:bg-amber-100" href={item.href}>
                    <span className="font-semibold text-amber-950">{item.title}</span>
                    <span className="mt-1 block text-sm text-amber-900">{item.detail}</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <div className="flex gap-3 rounded-lg bg-emerald-50 p-4 text-sm text-emerald-900">
              <ClipboardCheck aria-hidden="true" className="size-5 shrink-0 text-emerald-700" />
              No family forms currently need your attention.
            </div>
          )}
        </DashboardSection>
      </div>

      <div className={`grid gap-6 ${data.volunteer ? "xl:grid-cols-2" : ""}`}>
        <DashboardSection
          description="The latest published updates available to your account."
          icon={BellRing}
          title="Announcements"
        >
          {data.announcements.length ? (
            <ul className="space-y-4">
              {data.announcements.map((announcement) => (
                <li key={announcement.announcementId}>
                  <Link className="font-semibold text-slate-950 hover:text-sky-800" href="/communications">
                    {announcement.title}
                  </Link>
                  <p className="mt-1 text-xs text-slate-600">
                    {announcement.audienceLabel} · {displayDate(announcement.publishedAt)}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState message="There are no current announcements for your account." />
          )}
        </DashboardSection>

        {data.volunteer ? (
          <DashboardSection
            description="Your next active volunteer assignments."
            icon={UserRoundCheck}
            title="My Volunteer"
          >
            {data.volunteer.assignments.length ? (
              <ul className="space-y-4">
                {data.volunteer.assignments.map((assignment) => (
                  <li key={assignment.assignmentId}>
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
              <EmptyState message="You have no upcoming volunteer assignments." />
            )}
            <Link
              className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-sky-700 hover:text-sky-900"
              href={`/volunteers/${data.volunteer.profileId}`}
            >
              Open My Volunteer <ArrowRight aria-hidden="true" className="size-4" />
            </Link>
          </DashboardSection>
        ) : null}
      </div>

      <section aria-labelledby="quick-actions-heading">
        <h2 className="text-lg font-semibold text-slate-950" id="quick-actions-heading">Quick actions</h2>
        <p className="mt-1 text-sm text-slate-600">Go directly to common family tasks.</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {quickActions.map((action) => (
            <Link
              className="group rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-sky-300 hover:bg-sky-50"
              href={action.href}
              key={action.href}
            >
              <span className="flex items-center justify-between gap-3 font-semibold text-slate-950">
                {action.label}
                <ArrowRight aria-hidden="true" className="size-4 text-sky-700 transition group-hover:translate-x-0.5" />
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
  icon: typeof HeartHandshake;
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
        <span className="rounded-lg bg-sky-50 p-2.5 text-sky-700">
          <Icon aria-hidden="true" className="size-5" />
        </span>
      </div>
    </article>
  );
}

function DashboardSection({ children, description, icon: Icon, title }: Readonly<{
  children: React.ReactNode;
  description: string;
  icon: typeof HeartHandshake;
  title: string;
}>) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-950">{title}</h2>
          <p className="mt-1 text-sm text-slate-600">{description}</p>
        </div>
        <Icon aria-hidden="true" className="size-5 shrink-0 text-sky-700" />
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function EmptyState({ message }: Readonly<{ message: string }>) {
  return <p className="rounded-lg bg-slate-50 p-4 text-sm text-slate-600">{message}</p>;
}
