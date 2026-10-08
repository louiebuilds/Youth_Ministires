import type { ReactNode } from "react";
import Link from "next/link";

import type {
  AttendanceSessionReport,
  CheckInEventReport,
} from "@/features/attendance/types/attendance-reports";

import {
  archiveSavedReportAction,
  createSavedReportAction,
  renameSavedReportAction,
} from "@/features/reporting/actions/saved-report-actions";

import { PrintReportButton } from "@/features/reporting/components/print-report-button";

import type {
  ReportingData,
  ReportingRange,
} from "@/features/reporting/types/reporting";

const fmt = (value: string) =>
  new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));

export const reportSections = [
  "overview",
  "attendance",
  "events",
  "volunteers",
  "growth",
  "ministry-health",
  "saved-reports",
] as const;

export type ReportSection =
  (typeof reportSections)[number];

const sectionLabels: Record<
  ReportSection,
  string
> = {
  overview: "Overview",
  attendance: "Attendance",
  events: "Events",
  volunteers: "Volunteers",
  growth: "Growth",
  "ministry-health": "Ministry Health",
  "saved-reports": "Saved Reports",
};

function Metric({
  label,
  value,
  detail,
}: {
  label: string;
  value: string | number;
  detail: string;
}) {
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-sm font-medium text-slate-600">
        {label}
      </p>

      <p className="mt-2 text-3xl font-bold text-slate-950">
        {value}
      </p>

      <p className="mt-2 text-xs leading-5 text-slate-500">
        {detail}
      </p>
    </article>
  );
}

function WorkspaceLink({
  active,
  href,
  children,
}: {
  active: boolean;
  href: string;
  children: ReactNode;
}) {
  return (
    <Link
      className={
        active
          ? "inline-flex min-h-12 items-center border-b-2 border-sky-700 px-4 font-semibold text-sky-800"
          : "inline-flex min-h-12 items-center border-b-2 border-transparent px-4 font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-950"
      }
      href={href}
    >
      {children}
    </Link>
  );
}

function ExportLinks({
  report,
  range,
}: {
  report: string;
  range: ReportingRange;
}) {
  return (
    <span className="flex gap-2 print:hidden">
      <Link
        className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700"
        href={`/reports/export?report=${report}&format=csv&from=${range.fromDate}&to=${range.toDate}`}
      >
        CSV
      </Link>

      <Link
        className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700"
        href={`/reports/export?report=${report}&format=xlsx&from=${range.fromDate}&to=${range.toDate}`}
      >
        Excel
      </Link>
    </span>
  );
}

function reportHref(
  section: ReportSection,
  range: ReportingRange,
) {
  return `/reports?view=${section}&preset=custom&from=${range.fromDate}&to=${range.toDate}`;
}

export function ReportingWorkspace({
  data,
  range,
  attendanceSessions,
  checkIns,
  activeSection,
}: {
  data: ReportingData;
  range: ReportingRange;
  attendanceSessions: AttendanceSessionReport[];
  checkIns: CheckInEventReport[];
  activeSection: ReportSection;
}) {
  const o = data.overview;

  return (
    <div className="space-y-8">
      <header>
        <div className="max-w-4xl">
          <p className="text-sm font-semibold text-sky-700">
            Ministry operations
          </p>

          <h1 className="mt-1 text-3xl font-bold text-slate-950">
            Reporting &amp; Analytics
          </h1>

          <p className="mt-2 max-w-3xl text-slate-600">
            Live, authorized ministry metrics.
            Attendance, registration, and
            check-in remain separately labeled.
          </p>
        </div>

        <nav
          aria-label="Report sections"
          className="mt-8 flex flex-wrap border-b border-slate-200 print:hidden"
        >
          {reportSections.map((section) => (
            <WorkspaceLink
              active={
                activeSection === section
              }
              href={reportHref(
                section,
                range,
              )}
              key={section}
            >
              {sectionLabels[section]}
            </WorkspaceLink>
          ))}
        </nav>
      </header>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm print:hidden">
        <div className="mb-4 flex flex-wrap gap-2">
          <Link
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700"
            href={`/reports?view=${activeSection}&preset=30`}
          >
            Last 30 days
          </Link>

          <Link
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700"
            href={`/reports?view=${activeSection}&preset=90`}
          >
            Last 90 days
          </Link>

          <Link
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700"
            href={`/reports?view=${activeSection}&preset=ytd`}
          >
            Year to date
          </Link>

          <Link
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700"
            href={`/reports?view=${activeSection}&preset=365`}
          >
            Last 12 months
          </Link>
        </div>

        <form className="flex flex-wrap items-end gap-3">
          <input
            name="view"
            type="hidden"
            value={activeSection}
          />

          <input
            name="preset"
            type="hidden"
            value="custom"
          />

          <label className="text-sm font-semibold">
            From

            <input
              className="mt-1 block min-h-11 rounded-lg border border-slate-300 px-3"
              defaultValue={range.fromDate}
              name="from"
              required
              type="date"
            />
          </label>

          <label className="text-sm font-semibold">
            To

            <input
              className="mt-1 block min-h-11 rounded-lg border border-slate-300 px-3"
              defaultValue={range.toDate}
              name="to"
              required
              type="date"
            />
          </label>

          <button className="min-h-11 rounded-lg bg-sky-700 px-5 font-semibold text-white">
            Run custom range
          </button>

          <PrintReportButton />
        </form>

        <p className="mt-3 text-xs text-slate-500">
          Maximum range: 366 days. Current
          window: {range.fromDate} through{" "}
          {range.toDate}.
        </p>
      </section>

      {activeSection === "overview" ? (
        <section className="space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-slate-950">
                Overview
              </h2>

              <p className="mt-1 text-sm text-slate-600">
                Aggregate operational signals
                for the selected window.
              </p>
            </div>

            <ExportLinks
              range={range}
              report="overview"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Metric
              detail="Each youth counts once per reporting day across finalized present attendance."
              label="Unique youth attending"
              value={o.uniqueYouth}
            />

            <Metric
              detail="Youth whose first finalized present attendance occurred in this window."
              label="First-time participants"
              value={
                o.firstTimeParticipants
              }
            />

            <Metric
              detail="Registered, confirmed, or completed event registrations; not attendance."
              label="Registrations"
              value={o.registrations}
            />

            <Metric
              detail={`${o.filledPositions} filled of ${o.requiredPositions} required positions.`}
              label="Scheduling coverage"
              value={`${o.coveragePercentage}%`}
            />
          </div>
        </section>
      ) : null}

      {activeSection === "attendance" ? (
        <section className="space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-slate-950">
                Attendance
              </h2>

              <p className="mt-1 text-sm text-slate-600">
                Finalized present records are
                authoritative for trends;
                check-in is separate.
              </p>
            </div>

            <ExportLinks
              range={range}
              report="attendance"
            />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <TrendTable
              rows={data.weeklyTrends}
              title="Weekly trends"
            />

            <TrendTable
              rows={data.monthlyTrends}
              title="Monthly trends"
            />
          </div>

          <SimpleTable
            empty="No attendance sessions in this range."
            headers={[
              "Date",
              "Event / class",
              "Present",
              "Absent",
              "Excused",
              "Pending",
            ]}
            rows={attendanceSessions.map(
              (session) => [
                session.sessionDate,
                `${session.eventName} — ${session.className}`,
                session.presentCount,
                session.absentCount,
                session.excusedCount,
                session.pendingCount,
              ],
            )}
          />

          <SimpleTable
            empty="No check-in activity in this range."
            headers={[
              "Event check-in",
              "Still in",
              "Checked out",
              "Exceptions",
              "First-time visitor activity",
            ]}
            rows={checkIns.map((event) => [
              event.eventName,
              event.checkedInCount,
              event.checkedOutCount,
              event.exceptionCount,
              event.visitorCount,
            ])}
          />
        </section>
      ) : null}

      {activeSection === "events" ? (
        <section className="space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-slate-950">
                Events
              </h2>

              <p className="mt-1 text-sm text-slate-600">
                Registration and finalized
                attendance are intentionally
                separate.
              </p>
            </div>

            <ExportLinks
              range={range}
              report="events"
            />
          </div>

          <SimpleTable
            empty="No event participation trends in this range."
            headers={[
              "Period",
              "Registrations",
              "Attendance",
            ]}
            rows={data.eventTrends.map(
              (event) => [
                event.bucketStart,
                event.registrationCount,
                event.attendanceCount,
              ],
            )}
          />

          <SimpleTable
            empty="No events in this range."
            headers={[
              "Event",
              "Date",
              "Registered",
              "Waitlisted",
              "Attendance",
              "Capacity use",
              "Volunteers",
            ]}
            rows={data.events.map(
              (event) => [
                event.eventName,
                fmt(event.startsAt),
                event.registeredCount,
                event.waitlistedCount,
                event.attendanceCount,
                event.capacityUtilization ===
                null
                  ? "Not set"
                  : `${event.capacityUtilization}%`,
                event.volunteerStaffing,
              ],
            )}
          />
        </section>
      ) : null}

      {activeSection ===
      "volunteers" ? (
        <section className="space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-slate-950">
                Volunteers
              </h2>

              <p className="mt-1 text-sm text-slate-600">
                Scheduling is authoritative
                where present; legacy event
                assignments fill historical
                gaps. {o.upcomingAssignments}{" "}
                upcoming assignments are
                currently active.
              </p>
            </div>

            <ExportLinks
              range={range}
              report="volunteers"
            />
          </div>

          <SimpleTable
            empty="No volunteer assignment activity in this range."
            headers={[
              "Volunteer",
              "Responsibility",
              "Activity",
              "Status",
              "Source",
            ]}
            rows={data.volunteerActivity.map(
              (activity) => [
                activity.volunteerName,
                activity.responsibility,
                `${activity.eventName} — ${fmt(activity.startsAt)}`,
                activity.assignmentStatus,
                activity.source ===
                "scheduling"
                  ? "Scheduling"
                  : "Legacy Event",
              ],
            )}
          />

          <SimpleTable
            empty="No scheduling coverage in this range."
            headers={[
              "Schedule",
              "Required",
              "Filled",
              "Unfilled",
              "Coverage",
            ]}
            rows={data.coverage.map(
              (coverage) => [
                `${coverage.scheduleName} — ${fmt(coverage.startsAt)}`,
                coverage.requiredPositions,
                coverage.filledPositions,
                coverage.unfilledPositions,
                `${coverage.coveragePercentage}%`,
              ],
            )}
          />
        </section>
      ) : null}

      {activeSection === "growth" ? (
        <section className="space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-slate-950">
                Growth
              </h2>

              <p className="mt-1 text-sm text-slate-600">
                Record creation and first
                participation are shown as
                distinct measures.
              </p>
            </div>

            <ExportLinks
              range={range}
              report="growth"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <Metric
              detail="Students currently using the existing active lifecycle status."
              label="Active youth"
              value={o.activeYouth}
            />

            <Metric
              detail="Student records created during the selected window."
              label="New youth added"
              value={o.newYouthAdded}
            />

            <Metric
              detail="First finalized present attendance occurred during the window."
              label="First-time participants"
              value={
                o.firstTimeParticipants
              }
            />

            <Metric
              detail="Households currently using the existing active lifecycle status."
              label="Active households"
              value={o.activeHouseholds}
            />

            <Metric
              detail="Household records created during the selected window."
              label="New households"
              value={o.newHouseholds}
            />

            <Metric
              detail="Visitor check-in records; no returning-visitor continuity is claimed."
              label="First-time visitor activity"
              value={
                o.firstTimeVisitorActivity
              }
            />
          </div>
        </section>
      ) : null}

      {activeSection ===
      "ministry-health" ? (
        <section className="space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-slate-950">
                Ministry Health
              </h2>

              <p className="mt-1 text-sm text-slate-600">
                Transparent individual
                measures only—no composite
                score.
              </p>
            </div>

            <ExportLinks
              range={range}
              report="ministry_health"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Metric
              detail="Unique daily youth attendance in the selected window."
              label="Participation"
              value={o.uniqueYouth}
            />

            <Metric
              detail="New youth records; first-time participants are shown separately."
              label="Growth"
              value={o.newYouthAdded}
            />

            <Metric
              detail="Currently published or active upcoming events."
              label="Events"
              value={o.upcomingEvents}
            />

            <Metric
              detail="Current selected-window scheduling coverage."
              label="Volunteer operations"
              value={`${o.coveragePercentage}%`}
            />
          </div>
        </section>
      ) : null}

      {activeSection ===
      "saved-reports" ? (
        <section className="space-y-4 print:hidden">
          <div>
            <h2 className="text-2xl font-bold text-slate-950">
              Saved Reports
            </h2>

            <p className="mt-1 text-sm text-slate-600">
              Private configurations only.
              Running one always uses current
              authorized data.
            </p>
          </div>

          <form
            action={createSavedReportAction}
            className="flex flex-wrap gap-3 rounded-xl border border-slate-200 bg-white p-4"
          >
            <input
              className="min-h-11 rounded-lg border border-slate-300 px-3"
              name="name"
              placeholder="Report name"
              required
            />

            <select
              className="min-h-11 rounded-lg border border-slate-300 px-3"
              name="reportType"
            >
              <option value="overview">
                Overview
              </option>

              <option value="attendance">
                Attendance
              </option>

              <option value="events">
                Events
              </option>

              <option value="volunteers">
                Volunteers
              </option>

              <option value="growth">
                Growth
              </option>

              <option value="ministry_health">
                Ministry Health
              </option>
            </select>

            <input
              name="fromDate"
              type="hidden"
              value={range.fromDate}
            />

            <input
              name="toDate"
              type="hidden"
              value={range.toDate}
            />

            <button className="min-h-11 rounded-lg bg-sky-700 px-4 font-semibold text-white">
              Save current filters
            </button>
          </form>

          <div className="space-y-3">
            {data.savedReports.map(
              (report) => {
                const reportView =
                  report.reportType ===
                  "ministry_health"
                    ? "ministry-health"
                    : report.reportType;

                return (
                  <article
                    className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4"
                    key={report.id}
                  >
                    <div>
                      <h3 className="font-semibold text-slate-950">
                        {report.name}
                      </h3>

                      <p className="text-xs text-slate-500">
                        {report.reportType.replace(
                          "_",
                          " ",
                        )}{" "}
                        · private
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Link
                        className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold"
                        href={`/reports?view=${reportView}&preset=custom&from=${String(
                          report.configuration
                            .fromDate ??
                            range.fromDate,
                        )}&to=${String(
                          report.configuration
                            .toDate ??
                            range.toDate,
                        )}`}
                      >
                        Run
                      </Link>

                      <form
                        action={
                          renameSavedReportAction
                        }
                      >
                        <input
                          name="id"
                          type="hidden"
                          value={report.id}
                        />

                        <input
                          className="rounded-lg border border-slate-300 px-2 py-2 text-sm"
                          defaultValue={
                            report.name
                          }
                          name="name"
                          required
                        />

                        <button className="ml-1 rounded-lg border border-slate-300 px-3 py-2 text-sm">
                          Rename
                        </button>
                      </form>

                      <form
                        action={
                          archiveSavedReportAction
                        }
                      >
                        <input
                          name="id"
                          type="hidden"
                          value={report.id}
                        />

                        <button className="rounded-lg border border-red-200 px-3 py-2 text-sm text-red-700">
                          Delete
                        </button>
                      </form>
                    </div>
                  </article>
                );
              },
            )}

            {data.savedReports.length ===
            0 ? (
              <p className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
                No saved reports yet.
              </p>
            ) : null}
          </div>
        </section>
      ) : null}
    </div>
  );
}

function TrendTable({
  title,
  rows,
}: {
  title: string;
  rows: ReportingData["weeklyTrends"];
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <h3 className="font-bold text-slate-950">
        {title}
      </h3>

      <div className="mt-3">
        <SimpleTable
          empty="No finalized present attendance."
          headers={[
            "Period",
            "Attendance",
            "Unique youth/day",
          ]}
          rows={rows.map((row) => [
            row.bucketStart,
            row.attendanceCount,
            row.uniqueYouth,
          ])}
        />
      </div>
    </div>
  );
}

function SimpleTable({
  headers,
  rows,
  empty,
}: {
  headers: string[];
  rows: (string | number)[][];
  empty: string;
}) {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
      <table className="min-w-full text-left text-sm">
        <thead className="bg-slate-50">
          <tr>
            {headers.map((header) => (
              <th
                className="px-4 py-3 font-semibold"
                key={header}
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>

        <tbody className="divide-y divide-slate-200">
          {rows.map((row, rowIndex) => (
            <tr key={rowIndex}>
              {row.map(
                (cell, cellIndex) => (
                  <td
                    className="px-4 py-3"
                    key={cellIndex}
                  >
                    {cell}
                  </td>
                ),
              )}
            </tr>
          ))}

          {rows.length === 0 ? (
            <tr>
              <td
                className="px-4 py-6 text-slate-500"
                colSpan={headers.length}
              >
                {empty}
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}