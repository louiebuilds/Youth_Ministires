import {
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  House,
  ShieldCheck,
  UserRoundCheck,
  UsersRound,
} from "lucide-react";

import type { LucideIcon } from "lucide-react";

type FoundationMetric = Readonly<{
  description: string;
  icon: LucideIcon;
  label: string;
}>;

const foundationMetrics: readonly FoundationMetric[] = [
  {
    description: "Student records will appear after student management is built.",
    icon: UsersRound,
    label: "Active students",
  },
  {
    description: "Household totals will appear after family management is built.",
    icon: House,
    label: "Registered families",
  },
  {
    description: "Volunteer information will appear after volunteer tools are built.",
    icon: UserRoundCheck,
    label: "Active volunteers",
  },
  {
    description: "Scheduled events will appear after event management is built.",
    icon: CalendarDays,
    label: "Upcoming events",
  },
  {
    description: "Attendance totals will appear after attendance tracking is built.",
    icon: ClipboardCheck,
    label: "Today’s attendance",
  },
  {
    description: "Check-in activity will appear after check-in tools are built.",
    icon: CheckCircle2,
    label: "Current check-in",
  },
];

export function FoundationDashboard() {
  return (
    <div className="space-y-8">
      <section aria-labelledby="dashboard-heading">
        <p className="text-sm font-semibold text-sky-700">Foundation dashboard</p>
        <h1
          className="mt-1 text-3xl font-bold tracking-tight text-slate-950"
          id="dashboard-heading"
        >
          Ministry overview
        </h1>
        <p className="mt-2 max-w-3xl text-base leading-7 text-slate-600">
          Your secure ministry workspace is ready. Operational totals will
          populate as each ministry feature and its database records are added.
        </p>
      </section>

      <section aria-labelledby="metrics-heading">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-950" id="metrics-heading">
              Ministry metrics
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              These cards are placeholders and do not contain live data.
            </p>
          </div>
          <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-900">
            Data connections pending
          </span>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {foundationMetrics.map((metric) => {
            const Icon = metric.icon;

            return (
              <article
                className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
                key={metric.label}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="font-semibold text-slate-950">
                      {metric.label}
                    </h3>
                    <p className="mt-2 text-xl font-bold text-slate-400">
                      Not connected
                    </p>
                  </div>
                  <span className="rounded-lg bg-sky-50 p-2.5 text-sky-700">
                    <Icon aria-hidden="true" className="size-5" />
                  </span>
                </div>
                <p className="mt-4 text-sm leading-6 text-slate-600">
                  {metric.description}
                </p>
              </article>
            );
          })}
        </div>
      </section>

      <section
        aria-labelledby="platform-status-heading"
        className="rounded-xl border border-emerald-200 bg-emerald-50 p-5"
      >
        <div className="flex gap-4">
          <span className="rounded-lg bg-emerald-100 p-2.5 text-emerald-800">
            <ShieldCheck aria-hidden="true" className="size-5" />
          </span>
          <div>
            <h2
              className="text-base font-semibold text-emerald-950"
              id="platform-status-heading"
            >
              Foundation status
            </h2>
            <p className="mt-1 text-sm leading-6 text-emerald-900">
              Authentication, protected routing, and the application shell are
              active. Ministry data modules will be connected in their planned
              milestones.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
