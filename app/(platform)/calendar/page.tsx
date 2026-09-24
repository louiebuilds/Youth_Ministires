import Link from "next/link";

import { requireCapability } from "@/features/auth/services/authorization-service";
import { listPlatformCalendar } from "@/features/calendar/services/platform-calendar-service";
import type { CalendarItem, CalendarView } from "@/features/calendar/types/platform-calendar";
import {
  addDays,
  itemDateKey,
  parseCalendarDate,
  parseCalendarView,
  resolveCalendarRange,
  toDateKey,
} from "@/features/calendar/utils/calendar-range";

export const metadata = { title: "Calendar" };

const viewLabels: Record<CalendarView, string> = {
  month: "Month",
  week: "Week",
  agenda: "Agenda",
};

function calendarHref(view: CalendarView, date: Date) {
  return `/calendar?view=${view}&date=${toDateKey(date)}`;
}

function formatTime(item: CalendarItem) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: item.timezone,
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(item.startsAt));
}

function ItemLink({ item, compact = false }: Readonly<{ item: CalendarItem; compact?: boolean }>) {
  return (
    <Link
      className={`block rounded-lg border-l-4 px-2 py-1.5 text-left hover:brightness-95 ${
        item.itemType === "event"
          ? "border-violet-500 bg-violet-50 text-violet-950"
          : "border-sky-500 bg-sky-50 text-sky-950"
      }`}
      href={item.href}
    >
      <span className="block truncate text-xs font-semibold">
        {formatTime(item)} · {item.title}
      </span>
      {!compact && item.context ? (
        <span className="mt-0.5 block truncate text-xs opacity-75">{item.context}</span>
      ) : null}
    </Link>
  );
}

function MonthView({ anchor, from, to, items }: Readonly<{ anchor: Date; from: Date; to: Date; items: CalendarItem[] }>) {
  const days: Date[] = [];
  for (let day = from; day <= to; day = addDays(day, 1)) days.push(day);
  return (
    <div className="overflow-x-auto rounded-xl border bg-white">
      <div className="grid min-w-[760px] grid-cols-7 border-b bg-slate-50 text-center text-xs font-semibold uppercase tracking-wide text-slate-600">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => <div className="p-3" key={day}>{day}</div>)}
      </div>
      <div className="grid min-w-[760px] grid-cols-7">
        {days.map((day) => {
          const key = toDateKey(day);
          const dayItems = items.filter((item) => itemDateKey(item) === key);
          const muted = day.getUTCMonth() !== anchor.getUTCMonth();
          return (
            <section className={`min-h-32 border-b border-r p-2 ${muted ? "bg-slate-50 text-slate-400" : ""}`} key={key}>
              <p className="mb-2 text-sm font-semibold">{day.getUTCDate()}</p>
              <div className="space-y-1">{dayItems.map((item) => <ItemLink compact item={item} key={`${item.itemType}-${item.itemId}`} />)}</div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

function ListView({ from, to, items }: Readonly<{ from: Date; to: Date; items: CalendarItem[] }>) {
  const days: Date[] = [];
  for (let day = from; day <= to; day = addDays(day, 1)) days.push(day);
  return (
    <div className="space-y-4">
      {days.map((day) => {
        const key = toDateKey(day);
        const dayItems = items.filter((item) => itemDateKey(item) === key);
        if (!dayItems.length) return null;
        return (
          <section className="rounded-xl border bg-white p-4" key={key}>
            <h2 className="mb-3 text-lg font-bold">{new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric", timeZone: "UTC" }).format(day)}</h2>
            <div className="grid gap-2 md:grid-cols-2">{dayItems.map((item) => <ItemLink item={item} key={`${item.itemType}-${item.itemId}`} />)}</div>
          </section>
        );
      })}
      {!items.length ? <p className="rounded-xl border bg-white p-6 text-slate-600">No authorized calendar items in this date range.</p> : null}
    </div>
  );
}

export default async function CalendarPage({ searchParams }: Readonly<{ searchParams: Promise<{ view?: string; date?: string }> }>) {
  await requireCapability("events.view");
  const params = await searchParams;
  const view = parseCalendarView(params.view);
  const anchor = parseCalendarDate(params.date);
  const range = resolveCalendarRange(view, anchor);
  const result = await listPlatformCalendar(toDateKey(range.from), toDateKey(range.to));
  const items = result.success ? result.items : [];
  const title = view === "month"
    ? new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric", timeZone: "UTC" }).format(anchor)
    : `${new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" }).format(range.from)} – ${new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }).format(range.to)}`;

  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm font-semibold text-sky-700">Ministry dates</p>
        <h1 className="mt-1 text-3xl font-bold">Calendar</h1>
        <p className="mt-2 text-slate-600">Events, schedules, and your authorized family or volunteer commitments in one read-only view.</p>
      </header>
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-white p-3">
        <div className="flex flex-wrap gap-2">
          {(Object.keys(viewLabels) as CalendarView[]).map((item) => (
            <Link aria-current={view === item ? "page" : undefined} className={`min-h-11 rounded-lg px-4 py-3 text-sm font-semibold ${view === item ? "bg-sky-700 text-white" : "border bg-white text-slate-700"}`} href={calendarHref(item, anchor)} key={item}>{viewLabels[item]}</Link>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <Link aria-label="Previous calendar range" className="min-h-11 rounded-lg border px-4 py-3 font-semibold" href={calendarHref(view, range.previous)}>←</Link>
          <Link className="min-h-11 rounded-lg border px-4 py-3 font-semibold" href={`/calendar?view=${view}`}>Today</Link>
          <Link aria-label="Next calendar range" className="min-h-11 rounded-lg border px-4 py-3 font-semibold" href={calendarHref(view, range.next)}>→</Link>
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl font-bold">{title}</h2>
        <div className="flex gap-3 text-sm"><span className="font-semibold text-violet-700">● Events</span><span className="font-semibold text-sky-700">● Schedules</span></div>
      </div>
      {!result.success ? <p role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-950">We couldn&apos;t load the calendar. Please try again.</p> : view === "month" ? <MonthView anchor={anchor} from={range.from} items={items} to={range.to} /> : <ListView from={range.from} items={items} to={range.to} />}
    </div>
  );
}
