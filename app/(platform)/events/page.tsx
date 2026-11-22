import type { Metadata } from "next";
import Link from "next/link";

import { PageHero } from "@/components/ui/page-hero";

import { requireCapability } from "@/features/auth/services/authorization-service";
import { listEventCalendar } from "@/features/events/services/event-management-service";
import type { EventStatus } from "@/lib/supabase/database.types";
import { eventDisplayStatus } from "@/features/events/utils/event-lifecycle";

export const metadata: Metadata = { title: "Events" };

const validDate = /^\d{4}-\d{2}-\d{2}$/;
const statuses: EventStatus[] = [
  "draft", "published", "active", "completed", "archived",
];

export default async function EventsPage({
  searchParams,
}: Readonly<{
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}>) {
  const account = await requireCapability("events.view");
  const params = await searchParams;
  const today = new Date();
  const fromDefault = new Date(today);
  fromDefault.setUTCDate(1);
  const toDefault = new Date(fromDefault);
  toDefault.setUTCMonth(toDefault.getUTCMonth() + 3);
  const from = typeof params.from === "string" && validDate.test(params.from)
    ? params.from : fromDefault.toISOString().slice(0, 10);
  const to = typeof params.to === "string" && validDate.test(params.to)
    ? params.to : toDefault.toISOString().slice(0, 10);
  const search = typeof params.q === "string" && params.q.trim().length <= 100
    ? params.q.trim() || null : null;
  const status = typeof params.status === "string" &&
      statuses.includes(params.status as EventStatus)
    ? params.status as EventStatus : null;
  const rangeValid = to >= from &&
    (Date.parse(to) - Date.parse(from)) / 86_400_000 <= 400;
  const calendar = rangeValid
    ? await listEventCalendar({ fromDate: from, toDate: to, search, status })
    : null;
  const events = calendar?.success ? calendar.events : [];
  const canManage = account.role !== "volunteer" &&
    ["platform_administrator", "youth_pastor", "staff_member"]
      .includes(account.role);

  return (
    <div className="space-y-8">
      <PageHero
        actions={canManage ? (
          <Link className="inline-flex min-h-11 items-center justify-center rounded-lg bg-sky-700 px-5 font-semibold text-white"
            href="/events/new">
            Create event
          </Link>
        ) : null}
        description="View the ministry calendar and open an event workspace."
        eyebrow="Ministry planning"
        title="Events"
      />

      <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm shadow-slate-900/5 sm:p-6">
        <form className="grid gap-4 md:grid-cols-5" method="get">
          <label className="text-sm font-semibold text-slate-700">
            From
            <input className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3"
              defaultValue={from} name="from" type="date" />
          </label>
          <label className="text-sm font-semibold text-slate-700">
            To
            <input className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3"
              defaultValue={to} name="to" type="date" />
          </label>
          <label className="text-sm font-semibold text-slate-700">
            Search
            <input className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3"
              defaultValue={search ?? ""} maxLength={100} name="q"
              placeholder="Name, type, campus" />
          </label>
          <label className="text-sm font-semibold text-slate-700">
            Status
            <select className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3"
              defaultValue={status ?? ""} name="status">
              <option value="">All visible</option>
              {statuses.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
          </label>
          <button className="min-h-11 self-end rounded-lg bg-slate-900 px-4 font-semibold text-white">
            View calendar
          </button>
        </form>
        {!rangeValid ? (
          <p className="mt-3 text-sm font-semibold text-red-700">
            Choose a valid date range of 400 days or fewer.
          </p>
        ) : null}
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        {events.map((event) => (
          <Link
            className="group block rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm shadow-slate-900/5 transition hover:-translate-y-0.5 hover:border-teal-300 hover:shadow-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700"
            href={`/events/${event.eventId}`}
            key={event.eventId}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-sky-700">{event.eventType}</p>
                <h2 className="mt-1 text-xl font-bold text-slate-950">
                  {event.eventName}
                </h2>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                {eventDisplayStatus(event.eventStatus, event.endsAt)}
              </span>
            </div>
            <p className="mt-3 text-sm text-slate-700">
              {new Intl.DateTimeFormat("en-US", {
                dateStyle: "medium", timeStyle: "short",
                timeZone: event.timezone,
              }).format(new Date(event.startsAt))}
            </p>
            <p className="mt-1 text-sm text-slate-500">
              {[event.campus, event.building, event.room].filter(Boolean).join(" · ")
                || "Location not set"}
            </p>
            <p className="mt-1 text-sm text-slate-500">
              {event.capacity === null ? "No capacity set" : `Capacity ${event.capacity}`}
            </p>
          </Link>
        ))}
        {rangeValid && calendar && !calendar.success ? (
          <p className="rounded-xl border border-red-200 bg-red-50 p-6 font-semibold text-red-800" role="alert">
            We couldn&apos;t load the event calendar. Please try again.
          </p>
        ) : null}
        {calendar?.success && events.length === 0 ? (
          <p className="rounded-xl border border-slate-200 bg-white p-6 text-slate-500">
            No visible events match this calendar range.
          </p>
        ) : null}
      </section>
    </div>
  );
}
