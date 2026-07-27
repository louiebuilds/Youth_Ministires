import type { Metadata } from "next";
import Link from "next/link";

import {
  listAttendanceSessionReports,
  listCheckInEventReports,
} from "@/features/attendance/services/attendance-report-service";
import { requireCapability } from "@/features/auth/services/authorization-service";

export const metadata: Metadata = { title: "Attendance Reports" };

const isoDate = (date: Date) => date.toISOString().slice(0, 10);
const validDate = /^\d{4}-\d{2}-\d{2}$/;

export default async function ReportsPage({
  searchParams,
}: Readonly<{
  searchParams: Promise<{ from?: string | string[]; to?: string | string[] }>;
}>) {
  await requireCapability("reports.view");
  const params = await searchParams;
  const today = new Date();
  const thirtyDaysAgo = new Date(today);
  thirtyDaysAgo.setUTCDate(today.getUTCDate() - 30);
  const fromCandidate = typeof params.from === "string" ? params.from : "";
  const toCandidate = typeof params.to === "string" ? params.to : "";
  const fromDate = validDate.test(fromCandidate)
    ? fromCandidate : isoDate(thirtyDaysAgo);
  const toDate = validDate.test(toCandidate) ? toCandidate : isoDate(today);
  const rangeValid = toDate >= fromDate &&
    (Date.parse(toDate) - Date.parse(fromDate)) / 86_400_000 <= 366;
  const [sessions, checkIns] = rangeValid
    ? await Promise.all([
        listAttendanceSessionReports(fromDate, toDate),
        listCheckInEventReports(fromDate, toDate),
      ])
    : [[], []];

  return (
    <div className="space-y-8">
      <header>
        <p className="text-sm font-semibold text-sky-700">Attendance</p>
        <h1 className="mt-1 text-3xl font-bold text-slate-950">Reports</h1>
        <p className="mt-2 max-w-3xl text-slate-600">
          Operational session and custody summaries for a maximum one-year range.
          Cross-ministry trends and analytics remain in Milestone 16.
        </p>
      </header>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <form className="flex flex-col gap-4 sm:flex-row sm:items-end" method="get">
          <label className="text-sm font-semibold text-slate-700">
            From
            <input className="mt-1 block min-h-11 rounded-lg border border-slate-300 px-3"
              defaultValue={fromDate} name="from" required type="date" />
          </label>
          <label className="text-sm font-semibold text-slate-700">
            To
            <input className="mt-1 block min-h-11 rounded-lg border border-slate-300 px-3"
              defaultValue={toDate} name="to" required type="date" />
          </label>
          <button className="min-h-11 rounded-lg bg-sky-700 px-5 font-semibold text-white">
            Run report
          </button>
        </form>
        {!rangeValid ? (
          <p className="mt-3 text-sm font-semibold text-red-700">
            Choose a valid range of 366 days or fewer.
          </p>
        ) : null}
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-bold text-slate-950">Class attendance sessions</h2>
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-700">
              <tr>
                {["Date", "Event / class", "Present", "Absent", "Excused", "Pending", "State"].map((label) => (
                  <th className="px-4 py-3 font-semibold" key={label}>{label}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {sessions.map((session) => (
                <tr key={session.sessionId}>
                  <td className="px-4 py-3">{session.sessionDate}</td>
                  <td className="px-4 py-3">
                    <Link className="font-semibold text-sky-700 hover:text-sky-900"
                      href={`/attendance/${session.sessionId}`}>
                      {session.eventName}
                    </Link>
                    <span className="block text-slate-500">{session.className}</span>
                  </td>
                  <td className="px-4 py-3">{session.presentCount}</td>
                  <td className="px-4 py-3">{session.absentCount}</td>
                  <td className="px-4 py-3">{session.excusedCount}</td>
                  <td className="px-4 py-3">{session.pendingCount}</td>
                  <td className="px-4 py-3">
                    {session.finalizedAt ? "Finalized" : "Open"}
                  </td>
                </tr>
              ))}
              {sessions.length === 0 ? (
                <tr><td className="px-4 py-6 text-slate-500" colSpan={7}>
                  No class attendance sessions in this range.
                </td></tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-bold text-slate-950">Event check-in summaries</h2>
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-700">
              <tr>
                {["Event", "Still in", "Checked out", "Corrected", "Visitors", "Visitors out"].map((label) => (
                  <th className="px-4 py-3 font-semibold" key={label}>{label}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {checkIns.map((event) => (
                <tr key={event.eventId}>
                  <td className="px-4 py-3">
                    <strong>{event.eventName}</strong>
                    <span className="block text-slate-500">
                      {new Intl.DateTimeFormat("en-US", {
                        dateStyle: "medium", timeStyle: "short",
                      }).format(new Date(event.startsAt))}
                    </span>
                  </td>
                  <td className="px-4 py-3">{event.checkedInCount}</td>
                  <td className="px-4 py-3">{event.checkedOutCount}</td>
                  <td className="px-4 py-3">{event.exceptionCount}</td>
                  <td className="px-4 py-3">{event.visitorCount}</td>
                  <td className="px-4 py-3">{event.visitorCheckedOutCount}</td>
                </tr>
              ))}
              {checkIns.length === 0 ? (
                <tr><td className="px-4 py-6 text-slate-500" colSpan={6}>
                  No event check-in activity in this range.
                </td></tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
