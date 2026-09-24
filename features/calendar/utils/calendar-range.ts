import type { CalendarItem, CalendarView } from "@/features/calendar/types/platform-calendar";

const datePattern = /^\d{4}-\d{2}-\d{2}$/u;

export function parseCalendarView(value: string | undefined): CalendarView {
  return value === "week" || value === "agenda" ? value : "month";
}

export function parseCalendarDate(value: string | undefined, today = new Date()) {
  if (value && datePattern.test(value)) {
    const parsed = new Date(`${value}T12:00:00Z`);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  return new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate(), 12));
}

export function toDateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function startOfWeek(date: Date) {
  return addDays(date, -date.getUTCDay());
}

export function resolveCalendarRange(view: CalendarView, anchor: Date) {
  if (view === "week") {
    const from = startOfWeek(anchor);
    return { from, to: addDays(from, 6), previous: addDays(anchor, -7), next: addDays(anchor, 7) };
  }
  if (view === "agenda") {
    return { from: anchor, to: addDays(anchor, 29), previous: addDays(anchor, -30), next: addDays(anchor, 30) };
  }
  const monthStart = new Date(Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth(), 1, 12));
  const monthEnd = new Date(Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth() + 1, 0, 12));
  const from = startOfWeek(monthStart);
  const to = addDays(monthEnd, 6 - monthEnd.getUTCDay());
  return {
    from,
    to,
    previous: new Date(Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth() - 1, 1, 12)),
    next: new Date(Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth() + 1, 1, 12)),
  };
}

export function itemDateKey(item: CalendarItem) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: item.timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(item.startsAt));
}
