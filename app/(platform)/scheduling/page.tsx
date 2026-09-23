import type { Metadata } from "next";
import Link from "next/link";
import { requireCapability } from "@/features/auth/services/authorization-service";
import { listSchedules } from "@/features/scheduling/services/scheduling-service";
import { formatScheduleDateTime } from "@/features/scheduling/utils/scheduling-datetime";

export const metadata: Metadata = { title: "Scheduling" };
function parseDate(value: string | string[] | undefined, fallback: Date) { if (typeof value !== "string") return fallback; const date = new Date(`${value}T00:00:00`); return Number.isNaN(date.valueOf()) ? fallback : date; }

export default async function SchedulingPage({ searchParams }: Readonly<{ searchParams: Promise<Record<string, string | string[] | undefined>> }>) {
  const account = await requireCapability("scheduling.view");
  const manager = ["platform_administrator", "youth_pastor", "staff_member"].includes(account.role);
  const params = await searchParams; const now = new Date();
  const from = parseDate(params.from, new Date(now.getFullYear(), now.getMonth(), 1));
  const until = parseDate(params.until, new Date(now.getFullYear(), now.getMonth() + 2, 1));
  const rows = await listSchedules(from, until);
  const schedules = [...new Map(rows.map((row) => [row.scheduleId, row])).values()];
  return <div className="space-y-8">
    <header className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-sm font-semibold text-sky-700">Volunteer coordination</p><h1 className="mt-1 text-3xl font-bold">{manager ? "Scheduling" : "My schedule"}</h1><p className="mt-2 text-slate-600">{manager ? "Review schedules, open a workspace, or start a new plan." : "Your published ministry responsibilities."}</p></div>{manager ? <div className="flex flex-wrap gap-2"><Link className="min-h-11 rounded-lg bg-sky-700 px-4 py-3 font-semibold text-white" href="/scheduling/new">Create schedule</Link><Link className="min-h-11 rounded-lg border border-slate-300 bg-white px-4 py-3 font-semibold" href="/scheduling/rotations">Rotations</Link></div> : null}</header>
    <form className="grid gap-3 rounded-xl border bg-white p-5 md:grid-cols-3"><label className="text-sm font-semibold">From<input className="mt-1 min-h-11 w-full rounded-lg border px-3" type="date" name="from" defaultValue={from.toISOString().slice(0, 10)} /></label><label className="text-sm font-semibold">Until<input className="mt-1 min-h-11 w-full rounded-lg border px-3" type="date" name="until" defaultValue={until.toISOString().slice(0, 10)} /></label><button className="min-h-11 self-end rounded-lg bg-slate-900 px-4 font-semibold text-white">Update calendar window</button></form>
    <section className="space-y-4" aria-labelledby="schedule-calendar-heading"><h2 id="schedule-calendar-heading" className="text-2xl font-bold">Calendar</h2><div className="grid gap-4 lg:grid-cols-2">{schedules.map((schedule) => { const scheduleRows = rows.filter((row) => row.scheduleId === schedule.scheduleId); const positions = new Set(scheduleRows.map((row) => row.positionId).filter(Boolean)).size; const assignments = new Set(scheduleRows.map((row) => row.assignmentId).filter(Boolean)).size; return <article className="rounded-xl border bg-white p-5 shadow-sm" key={schedule.scheduleId}><div className="flex items-start justify-between gap-3"><div><h3 className="text-xl font-bold">{schedule.scheduleName}</h3><p className="mt-1 text-sm text-slate-600">{formatScheduleDateTime(schedule.startsAt, schedule.timezone)} – {formatScheduleDateTime(schedule.endsAt, schedule.timezone)}</p><p className="text-sm text-slate-600">{schedule.timezone}</p></div><span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold capitalize">{schedule.status}</span></div><p className="mt-4 text-sm text-slate-600">{positions} position{positions === 1 ? "" : "s"} · {assignments} active assignment{assignments === 1 ? "" : "s"}</p><Link className="mt-4 inline-flex min-h-11 items-center rounded-lg border border-slate-300 px-4 font-semibold" href={`/scheduling/${schedule.scheduleId}`}>Open schedule</Link></article>; })}</div>{!schedules.length ? <p className="rounded-xl border bg-white p-6 text-slate-600">No visible schedules in this date window.</p> : null}</section>
  </div>;
}
