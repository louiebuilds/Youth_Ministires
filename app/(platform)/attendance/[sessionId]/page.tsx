import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";

import { requireCapability } from "@/features/auth/services/authorization-service";
import {
  AttendanceRecordForm,
  FinalizeAttendanceForm,
} from "@/features/attendance/components/attendance-management-forms";
import {
  listAttendanceRoster,
  listAttendanceSessions,
} from "@/features/attendance/services/attendance-management-service";

export const metadata: Metadata = { title: "Attendance roster" };

export default async function AttendanceRosterPage({
  params, searchParams,
}: Readonly<{
  params: Promise<{ sessionId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}>) {
  await requireCapability("attendance.manage");
  const parsed = z.string().uuid().safeParse((await params).sessionId);
  if (!parsed.success) notFound();
  const query = await searchParams;
  const search = typeof query.q === "string" && query.q.length <= 100
    ? query.q.trim() || null : null;
  const sessions = await listAttendanceSessions();
  const session = sessions.find((item) => item.sessionId === parsed.data);
  if (!session) notFound();
  const roster = await listAttendanceRoster(session.sessionId, search);
  const finalized = Boolean(session.finalizedAt);
  return <div className="space-y-8">
    <section><Link className="text-sm font-semibold text-sky-700 hover:text-sky-900" href="/attendance">← Back to attendance</Link><div className="mt-3 flex flex-wrap items-start justify-between gap-3"><div><h1 className="text-3xl font-bold tracking-tight text-slate-950">{session.className}</h1><p className="mt-2 text-base text-slate-600">{session.eventName} · {session.sessionDate}</p></div><span className={`rounded-full px-3 py-1.5 text-sm font-semibold ${finalized ? "bg-slate-100 text-slate-700" : "bg-emerald-100 text-emerald-800"}`}>{finalized ? "Finalized" : "Open"}</span></div></section>
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><form className="flex flex-col gap-3 sm:flex-row" method="get"><label className="grow text-sm font-medium text-slate-800">Find student or family<input className="mt-2 min-h-11 w-full rounded-lg border border-slate-300 px-3 py-2" defaultValue={search ?? ""} maxLength={100} name="q" type="search" /></label><button className="min-h-11 self-end rounded-lg bg-sky-700 px-5 py-2 text-sm font-semibold text-white">Search roster</button></form></section>
    {roster.length === 0 ? <section className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-slate-600">No active or registered students match this search.</section> : <section className="grid gap-4 lg:grid-cols-2">{roster.map((entry) => <AttendanceRecordForm entry={entry} finalized={finalized} key={entry.studentId} sessionId={session.sessionId} />)}</section>}
    {!finalized ? <FinalizeAttendanceForm sessionId={session.sessionId} /> : null}
  </div>;
}
