import Link from "next/link";
import { ArrowRight, CalendarDays, Megaphone, Sparkles } from "lucide-react";

import { openHeaderNotificationAction } from "@/features/notifications/actions/header-notification-actions";
import type {
  DashboardAnnouncementSpotlight,
  DashboardHomeAction,
} from "@/features/dashboard/types/dashboard-home";

function greeting() {
  const hour = Number(new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    hour12: false,
    timeZone: "America/Chicago",
  }).format(new Date()));
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export function DashboardHomeTop({
  actions,
  displayName,
  eyebrow,
  spotlight,
  summary,
}: Readonly<{
  actions: readonly DashboardHomeAction[];
  displayName: string;
  eyebrow: string;
  spotlight: DashboardAnnouncementSpotlight | null;
  summary: string;
}>) {
  const today = new Intl.DateTimeFormat("en-US", {
    dateStyle: "full",
    timeZone: "America/Chicago",
  }).format(new Date());
  return (
    <>
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-sky-800 via-blue-800 to-indigo-950 px-6 py-8 text-white shadow-lg sm:px-8 sm:py-10">
        <div aria-hidden="true" className="absolute -right-16 -top-20 size-64 rounded-full bg-white/10" />
        <div aria-hidden="true" className="absolute -bottom-24 right-24 size-48 rounded-full bg-sky-300/10" />
        <div className="relative max-w-3xl">
          <p className="flex items-center gap-2 text-sm font-bold uppercase tracking-[0.15em] text-sky-200">
            <Sparkles aria-hidden="true" className="size-4" /> {eyebrow}
          </p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
            {greeting()}, {displayName}
          </h1>
          <p className="mt-3 flex items-center gap-2 text-sm font-medium text-sky-100">
            <CalendarDays aria-hidden="true" className="size-4" /> {today}
          </p>
          <p className="mt-4 max-w-2xl text-base leading-7 text-blue-50 sm:text-lg">{summary}</p>
        </div>
      </section>

      <section aria-labelledby="dashboard-actions-heading">
        <h2 className="text-lg font-bold text-slate-950" id="dashboard-actions-heading">Quick actions</h2>
        <p className="mt-1 text-sm text-slate-600">Start with the things you use most.</p>
        <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {actions.slice(0, 4).map((action, index) => (
            <Link
              className={`group rounded-2xl border p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700 ${
                index === 0 ? "border-sky-200 bg-sky-50" : index === 1 ? "border-indigo-200 bg-indigo-50" : index === 2 ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50"
              }`}
              href={action.href}
              key={action.href}
            >
              <span className="flex items-center justify-between gap-2 font-bold text-slate-950">
                {action.label}<ArrowRight aria-hidden="true" className="size-4 transition group-hover:translate-x-1" />
              </span>
              <span className="mt-2 hidden text-sm leading-6 text-slate-600 sm:block">{action.description}</span>
            </Link>
          ))}
        </div>
      </section>

      {spotlight ? (
        <section aria-labelledby="announcement-spotlight-heading" className="overflow-hidden rounded-2xl border border-amber-300 bg-gradient-to-r from-amber-50 to-orange-50 shadow-sm">
          <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
            <div className="flex min-w-0 gap-4">
              <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-amber-500 text-white"><Megaphone aria-hidden="true" className="size-5" /></span>
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-wide text-amber-800">New announcement</p>
                <h2 className="mt-1 text-xl font-bold text-slate-950" id="announcement-spotlight-heading">{spotlight.title}</h2>
                <p className="mt-2 text-sm leading-6 text-slate-700">{spotlight.messagePreview}</p>
                {spotlight.remainingCount ? <p className="mt-2 text-xs font-semibold text-amber-800">+{spotlight.remainingCount} more unread announcement{spotlight.remainingCount === 1 ? "" : "s"}</p> : null}
              </div>
            </div>
            <form action={openHeaderNotificationAction} className="shrink-0">
              <input name="notificationType" type="hidden" value="announcement" />
              <input name="notificationId" type="hidden" value={spotlight.announcementId} />
              <button className="min-h-11 w-full rounded-xl bg-amber-600 px-5 font-bold text-white hover:bg-amber-700 sm:w-auto" type="submit">Read announcement</button>
            </form>
          </div>
        </section>
      ) : null}
    </>
  );
}
