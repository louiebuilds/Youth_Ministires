import type { Metadata } from "next";
import Link from "next/link";

import { AdministrationAuditRow } from "@/features/auth/components/administration-audit-row";
import { requireCapability } from "@/features/auth/services/authorization-service";
import { listManagedAuditEvents } from "@/features/auth/services/audit-management-service";

import type { AuditResult } from "@/features/auth/types/audit-management";

export const metadata: Metadata = { title: "Audit Log" };

const auditResults: readonly AuditResult[] = ["success", "failure", "denied"];
const datePattern = /^\d{4}-\d{2}-\d{2}$/;

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function boundedText(value: string | string[] | undefined) {
  return firstValue(value).trim().slice(0, 100);
}

function readableValue(value: string) {
  const words = value.replaceAll(/[._-]+/g, " ");
  return words.charAt(0).toUpperCase() + words.slice(1);
}

export default async function AuditLogPage({
  searchParams,
}: Readonly<{
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}>) {
  await requireCapability("administration.manage");

  const parameters = await searchParams;
  const search = boundedText(parameters.search);
  const action = boundedText(parameters.action);
  const requestedResult = firstValue(parameters.result);
  const result = auditResults.includes(requestedResult as AuditResult)
    ? (requestedResult as AuditResult)
    : undefined;
  const requestedDateFrom = firstValue(parameters.dateFrom);
  const requestedDateTo = firstValue(parameters.dateTo);
  const dateFrom = datePattern.test(requestedDateFrom) ? requestedDateFrom : "";
  const dateTo = datePattern.test(requestedDateTo) ? requestedDateTo : "";
  const hasFilters = Boolean(search || action || result || dateFrom || dateTo);

  const auditResult = await listManagedAuditEvents({
    search,
    action,
    result,
    dateFrom,
    dateTo,
    limit: 100,
  });

  const dateFormatter = new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  return (
    <div className="space-y-8">
      <header>
        <p className="text-sm font-semibold text-sky-700">Administration</p>
        <h1 className="mt-1 text-3xl font-bold text-slate-950">Audit Log</h1>
        <p className="mt-2 text-slate-600">
          Review the read-only record of administrative and system activity.
        </p>
        <Link
          className="mt-4 inline-flex min-h-11 items-center rounded-lg border border-slate-300 px-4 font-semibold text-slate-700 hover:bg-slate-50"
          href="/administration"
        >
          Back to Administration
        </Link>
      </header>

      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <form className="grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(14rem,2fr)_minmax(11rem,1.25fr)_9rem_10rem_10rem_auto] xl:items-end">
          <label className="text-sm font-semibold text-slate-800">
            Search
            <input
              className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3 text-slate-950"
              defaultValue={search}
              maxLength={100}
              name="search"
              placeholder="Action, entity, ID, or actor"
              type="search"
            />
          </label>
          <label className="text-sm font-semibold text-slate-800">
            Action
            <input
              className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3 text-slate-950"
              defaultValue={action}
              maxLength={100}
              name="action"
              placeholder="Exact action"
            />
          </label>
          <label className="text-sm font-semibold text-slate-800">
            Result
            <select
              className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-slate-950"
              defaultValue={result ?? ""}
              name="result"
            >
              <option value="">All</option>
              {auditResults.map((value) => (
                <option key={value} value={value}>
                  {readableValue(value)}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm font-semibold text-slate-800">
            From
            <input
              className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3 text-slate-950"
              defaultValue={dateFrom}
              name="dateFrom"
              type="date"
            />
          </label>
          <label className="text-sm font-semibold text-slate-800">
            Through
            <input
              className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3 text-slate-950"
              defaultValue={dateTo}
              name="dateTo"
              type="date"
            />
          </label>
          <div className="flex gap-2">
            <button className="min-h-11 rounded-lg bg-slate-900 px-5 font-semibold text-white hover:bg-slate-800">
              Filter
            </button>
            {hasFilters ? (
              <Link
                className="inline-flex min-h-11 items-center rounded-lg border border-slate-300 px-4 font-semibold text-slate-700 hover:bg-slate-50"
                href="/administration/audit"
              >
                Clear
              </Link>
            ) : null}
          </div>
        </form>
      </section>

      {!auditResult.success ? (
        <section
          className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-amber-950"
          role="alert"
        >
          <h2 className="font-bold">Audit events could not be loaded</h2>
          <p className="mt-1 text-sm">
            {auditResult.reason === "denied"
              ? "You do not have permission to view the audit log."
              : auditResult.reason === "invalid"
                ? "The selected audit filters are invalid."
                : "The audit log is temporarily unavailable. Please try again."}
          </p>
        </section>
      ) : auditResult.events.length === 0 ? (
        <section className="rounded-xl border border-slate-200 bg-white p-5 text-slate-600 shadow-sm">
          No audit events match these filters.
        </section>
      ) : (
        <section aria-label="Audit events" className="space-y-3">
          <p className="text-sm text-slate-500">
            Showing up to 100 most recent matching events.
          </p>
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="hidden gap-3 border-b border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold uppercase tracking-wide text-slate-500 lg:grid lg:grid-cols-[9rem_minmax(8rem,1fr)_minmax(10rem,1.3fr)_minmax(11rem,1.25fr)_5rem_5rem_4.5rem]">
              <span>Date/time</span>
              <span>Actor</span>
              <span>Action</span>
              <span>Entity</span>
              <span>Result</span>
              <span>Source</span>
              <span>Details</span>
            </div>
            <div className="divide-y divide-slate-200">
              {auditResult.events.map((event) => (
                <AdministrationAuditRow
                  actionLabel={readableValue(event.action)}
                  entityLabel={readableValue(event.entityType)}
                  event={event}
                  formattedDate={dateFormatter.format(
                    new Date(event.occurredAt),
                  )}
                  key={event.id}
                />
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
