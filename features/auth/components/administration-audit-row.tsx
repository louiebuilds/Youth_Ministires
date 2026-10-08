"use client";

import { useState } from "react";

import type { ManagedAuditEvent } from "@/features/auth/types/audit-management";
import type { Json } from "@/lib/supabase/database.types";

const resultClassNames = {
  denied: "bg-amber-50 text-amber-800",
  failure: "bg-red-50 text-red-700",
  success: "bg-emerald-50 text-emerald-700",
} as const;

function hasMetadata(metadata: Json) {
  if (metadata === null) return false;
  if (Array.isArray(metadata)) return metadata.length > 0;
  if (typeof metadata === "object") return Object.keys(metadata).length > 0;
  return true;
}

function compactId(value: string) {
  return value.length > 8 ? `${value.slice(0, 8)}…` : value;
}

export function AdministrationAuditRow({
  actionLabel,
  entityLabel,
  event,
  formattedDate,
}: Readonly<{
  actionLabel: string;
  entityLabel: string;
  event: ManagedAuditEvent;
  formattedDate: string;
}>) {
  const [expanded, setExpanded] = useState(false);
  const detailsId = `audit-event-details-${event.id}`;
  const showMetadata = hasMetadata(event.metadata);

  return (
    <article>
      <div className="grid gap-x-3 gap-y-2 px-3 py-2.5 sm:grid-cols-2 lg:grid-cols-[9rem_minmax(8rem,1fr)_minmax(10rem,1.3fr)_minmax(11rem,1.25fr)_5rem_5rem_4.5rem] lg:items-center">
        <time
          className="text-xs text-slate-600 sm:text-sm"
          dateTime={event.occurredAt}
        >
          <span className="font-semibold lg:hidden">Date/time: </span>
          {formattedDate}
        </time>

        <p
          className="min-w-0 truncate text-sm text-slate-700"
          title={event.actorDisplayName ?? "System"}
        >
          <span className="font-semibold lg:hidden">Actor: </span>
          {event.actorDisplayName ?? "System"}
        </p>

        <p
          className="min-w-0 truncate text-sm font-semibold text-slate-900"
          title={event.action}
        >
          <span className="font-semibold lg:hidden">Action: </span>
          {actionLabel}
        </p>

        <p
          className="min-w-0 truncate text-sm text-slate-700"
          title={
            event.entityId
              ? `${event.entityType} · ${event.entityId}`
              : event.entityType
          }
        >
          <span className="font-semibold lg:hidden">Entity: </span>
          {entityLabel}
          {event.entityId ? ` · ${compactId(event.entityId)}` : null}
        </p>

        <p className="text-sm text-slate-700">
          <span className="font-semibold lg:hidden">Result: </span>
          <span
            className={`rounded px-2 py-0.5 text-xs font-semibold capitalize ${resultClassNames[event.result]}`}
          >
            {event.result}
          </span>
        </p>

        <p className="text-sm capitalize text-slate-700">
          <span className="font-semibold lg:hidden">Source: </span>
          {event.source}
        </p>

        <button
          aria-controls={detailsId}
          aria-expanded={expanded}
          className="justify-self-start text-xs font-semibold text-sky-700 hover:text-sky-900 hover:underline"
          onClick={() => setExpanded((current) => !current)}
          type="button"
        >
          {expanded ? "Hide" : "Details"}
        </button>
      </div>

      {expanded ? (
        <div
          className="border-t border-slate-100 bg-slate-50 px-3 py-3 text-xs text-slate-700"
          id={detailsId}
        >
          <dl className="grid gap-x-6 gap-y-2 sm:grid-cols-2 lg:grid-cols-4">
            <div className="min-w-0">
              <dt className="font-semibold text-slate-900">Action value</dt>
              <dd className="break-all">{event.action}</dd>
            </div>
            <div className="min-w-0">
              <dt className="font-semibold text-slate-900">Entity type</dt>
              <dd className="break-all">{event.entityType}</dd>
            </div>
            <div className="min-w-0">
              <dt className="font-semibold text-slate-900">Entity ID</dt>
              <dd className="break-all">{event.entityId ?? "Not provided"}</dd>
            </div>
            <div className="min-w-0">
              <dt className="font-semibold text-slate-900">Request ID</dt>
              <dd className="break-all">{event.requestId ?? "Not provided"}</dd>
            </div>
          </dl>

          {showMetadata ? (
            <div className="mt-3">
              <p className="font-semibold text-slate-900">Metadata</p>
              <pre className="mt-1 max-h-64 overflow-auto whitespace-pre-wrap break-words rounded-md border border-slate-200 bg-white p-3 font-mono text-xs leading-5 text-slate-700">
                {JSON.stringify(event.metadata, null, 2)}
              </pre>
            </div>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}
