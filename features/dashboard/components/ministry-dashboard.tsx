import {
  BellRing,
  Cake,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  HeartHandshake,
  UserRoundCheck,
  UsersRound,
} from "lucide-react";

import { DashboardHomeTop } from "@/features/dashboard/components/dashboard-home-top";
import type { DashboardAnnouncementSpotlight } from "@/features/dashboard/types/dashboard-home";
import type {
  DashboardMetricTone,
  MinistryDashboardData,
} from "@/features/dashboard/types/ministry-dashboard";
import type { LucideIcon } from "lucide-react";

type MinistryDashboardProps = Readonly<{
  data: MinistryDashboardData;
  displayName: string;
  spotlight: DashboardAnnouncementSpotlight | null;
}>;

const metricIcons: readonly LucideIcon[] = [
  ClipboardCheck,
  CalendarDays,
  UserRoundCheck,
  UsersRound,
  HeartHandshake,
  Cake,
];

const metricToneClasses: Record<DashboardMetricTone, string> = {
  amber: "bg-amber-50 text-amber-700",
  emerald: "bg-emerald-50 text-emerald-700",
  rose: "bg-rose-50 text-rose-700",
  sky: "bg-sky-50 text-sky-700",
  slate: "bg-slate-100 text-slate-700",
  violet: "bg-violet-50 text-violet-700",
};

export function MinistryDashboard({ data, displayName, spotlight }: MinistryDashboardProps) {
  const isFamilyDashboard = data.audience === "family";

  return (
    <div className="space-y-8">
      <DashboardHomeTop
        actions={data.quickActions}
        displayName={displayName}
        eyebrow={isFamilyDashboard ? "Family dashboard" : "Ministry dashboard"}
        spotlight={spotlight}
        summary={isFamilyDashboard
          ? "Your family’s important updates and upcoming commitments, all in one place."
          : "Here’s what matters most in the ministry today."}
      />

      <section aria-labelledby="summary-heading">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-950" id="summary-heading">
              Ministry summary
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              {isFamilyDashboard
                ? "A private preview limited to household-related information."
                : "A preview of the operational signals leaders will see first."}
            </p>
          </div>
          <span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold text-sky-800">
            {data.dataSource === "live" || data.dataSource === "hybrid"
              ? "Live overview"
              : "Sample overview"}
          </span>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          {data.metrics.slice(0, 3).map((metric, index) => {
            const Icon = metricIcons[index] ?? BellRing;

            return (
              <article
                className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
                key={metric.label}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-sm font-medium text-slate-600">
                      {metric.label}
                    </h3>
                    <p className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
                      {metric.value}
                    </p>
                  </div>
                  <span
                    className={`rounded-lg p-2.5 ${metricToneClasses[metric.tone]}`}
                  >
                    <Icon aria-hidden="true" className="size-5" />
                  </span>
                </div>
                <p className="mt-4 text-sm leading-6 text-slate-600">
                  {metric.detail}
                </p>
              </article>
            );
          })}
        </div>
      </section>

      <div
        className={
          isFamilyDashboard
            ? "grid gap-6"
            : "grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(18rem,0.75fr)]"
        }
      >
        <section
          aria-labelledby="events-heading"
          className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
        >
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-950" id="events-heading">
                Upcoming events
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                The next scheduled ministry activities.
              </p>
            </div>
            <CalendarDays aria-hidden="true" className="size-5 text-sky-700" />
          </div>
          <ul className="mt-5 divide-y divide-slate-200">
            {data.upcomingEvents.slice(0, 3).map((event) => (
              <li
                className="grid gap-3 py-4 first:pt-0 last:pb-0 sm:grid-cols-[5rem_minmax(0,1fr)_auto] sm:items-center"
                key={`${event.dateLabel}-${event.name}`}
              >
                <span className="w-fit rounded-lg bg-sky-50 px-3 py-2 text-sm font-semibold text-sky-800">
                  {event.dateLabel}
                </span>
                <div>
                  <h3 className="font-semibold text-slate-950">{event.name}</h3>
                  <p className="mt-1 text-sm text-slate-600">{event.timeLabel}</p>
                </div>
                <p className="text-sm font-medium text-slate-700">
                  {event.registrationLabel}
                </p>
              </li>
            ))}
          </ul>
          {!data.upcomingEvents.length ? (
            <p className="mt-5 rounded-lg bg-slate-50 p-4 text-sm text-slate-600">
              No upcoming visible events.
            </p>
          ) : null}
        </section>

        {!isFamilyDashboard && (
          <section
            aria-labelledby="volunteer-heading"
            className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
          >
          <div className="flex items-center gap-3">
            <span className="rounded-lg bg-emerald-50 p-2.5 text-emerald-700">
              <UserRoundCheck aria-hidden="true" className="size-5" />
            </span>
            <div>
              <h2
                className="text-lg font-semibold text-slate-950"
                id="volunteer-heading"
              >
                Volunteer status
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                Coverage for upcoming activities.
              </p>
            </div>
          </div>
          <dl className="mt-6 space-y-4">
            <StatusRow
              label="Confirmed"
              tone="bg-emerald-500"
              value={data.volunteerStatus.confirmed}
            />
            <StatusRow
              label="Pending response"
              tone="bg-amber-500"
              value={data.volunteerStatus.pending}
            />
            <StatusRow
              label="Still needed"
              tone="bg-rose-500"
              value={data.volunteerStatus.needed}
            />
          </dl>
          </section>
        )}
      </div>

      <div
        className={isFamilyDashboard ? "grid gap-6" : "grid gap-6 lg:grid-cols-2"}
      >
        {!isFamilyDashboard && (
        <section
          aria-labelledby="prayer-heading"
          className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
        >
          <div className="flex items-center gap-3">
            <HeartHandshake aria-hidden="true" className="size-5 text-rose-700" />
            <h2 className="font-semibold text-slate-950" id="prayer-heading">
              Prayer requests
            </h2>
          </div>
          <dl className="mt-5 grid grid-cols-3 gap-2 text-center">
            <CompactStat label="New" value={data.prayerRequestSummary.newCount} />
            <CompactStat
              label="Follow-up"
              value={data.prayerRequestSummary.followUpCount}
            />
            <CompactStat
              label="Confidential"
              value={data.prayerRequestSummary.confidentialCount}
            />
          </dl>
          <p className="mt-4 text-xs leading-5 text-slate-500">
            Counts only. Confidential request content is never exposed here.
          </p>
        </section>
        )}

        {!isFamilyDashboard && (
        <section
          aria-labelledby="birthdays-heading"
          className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
        >
          <div className="flex items-center gap-3">
            <Cake aria-hidden="true" className="size-5 text-violet-700" />
            <h2 className="font-semibold text-slate-950" id="birthdays-heading">
              Birthdays
            </h2>
          </div>
          <ul className="mt-4 space-y-3">
            {data.birthdays.map((birthday) => (
              <li
                className="flex items-center justify-between gap-3 text-sm"
                key={`${birthday.dateLabel}-${birthday.displayName}`}
              >
                <span className="font-medium text-slate-900">
                  {birthday.displayName}
                </span>
                <span className="text-slate-600">{birthday.dateLabel}</span>
              </li>
            ))}
          </ul>
          {!data.birthdays.length ? (
            <p className="mt-4 text-sm text-slate-600">
              No birthdays in the next 14 days.
            </p>
          ) : null}
        </section>
        )}

      </div>

      {data.dataSource !== "live" ? (
        <section
          aria-labelledby="preview-status-heading"
          className="rounded-xl border border-emerald-200 bg-emerald-50 p-5"
        >
          <div className="flex gap-4">
            <CheckCircle2
              aria-hidden="true"
              className="mt-0.5 size-5 shrink-0 text-emerald-700"
            />
            <div>
              <h2
                className="text-sm font-semibold text-emerald-950"
                id="preview-status-heading"
              >
                Dashboard framework ready
              </h2>
              <p className="mt-1 text-sm leading-6 text-emerald-900">
                Preview content remains clearly identified until its authorized live source is connected.
              </p>
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
}

type StatusRowProps = Readonly<{
  label: string;
  tone: string;
  value: number;
}>;

function StatusRow({ label, tone, value }: StatusRowProps) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="flex items-center gap-2 text-sm text-slate-700">
        <span aria-hidden="true" className={`size-2 rounded-full ${tone}`} />
        {label}
      </dt>
      <dd className="text-lg font-bold text-slate-950">{value}</dd>
    </div>
  );
}

type CompactStatProps = Readonly<{
  label: string;
  value: number;
}>;

function CompactStat({ label, value }: CompactStatProps) {
  return (
    <div className="rounded-lg bg-slate-50 px-2 py-3">
      <dt className="text-xs text-slate-600">{label}</dt>
      <dd className="mt-1 text-xl font-bold text-slate-950">{value}</dd>
    </div>
  );
}
