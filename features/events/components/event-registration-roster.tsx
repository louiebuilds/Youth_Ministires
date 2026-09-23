"use client";

import { useActionState } from "react";

import { createParticipationOverrideAction, promoteWaitlistedRegistrationAction } from "@/features/events/actions/event-management-actions";
import Link from "next/link";
import {
  describeReadinessRequirement,
  getParticipationOverrideState,
} from "@/features/events/components/event-registration-readiness.mjs";

import type {
  EventActionState,
  ManagedEventRegistration,
  EventRegistrationReadiness,
} from "@/features/events/types/event-management";

const initialState: EventActionState = { success: false };

function RegistrationRow({
  eventId,
  registration,
  readiness,
}: Readonly<{
  eventId: string;
  registration: ManagedEventRegistration;
  readiness?: EventRegistrationReadiness;
}>) {
  const [state, action, pending] = useActionState(
    promoteWaitlistedRegistrationAction,
    initialState,
  );
  return (
    <tr className="border-t border-slate-200 align-top">
      <td className="px-3 py-3">
        <span className="font-semibold text-slate-950">
          {registration.studentName}
        </span>
        <span className="block text-sm text-slate-500">
          {registration.householdName}
        </span>
        {state.message ? (
          <span className={`mt-2 block text-sm font-semibold ${
            state.success ? "text-emerald-700" : "text-red-700"
          }`}>
            {state.message}
          </span>
        ) : null}
      </td>
      <td className="px-3 py-3">
        {readiness ? <div className="space-y-2">
          <span className={`rounded-full px-3 py-1 text-sm font-semibold ${readiness.documentationReady ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-900"}`}>
            {readiness.documentationReady ? "READY" : "NOT READY"}
          </span>
          {readiness.participationOverrideId ? <p className="text-xs font-semibold text-sky-700">Participation override: APPROVED</p> : null}
          {!readiness.documentationReady ? <ul className="text-xs text-slate-600">{readiness.requirements.filter((item) => !item.ready).map((item) => <li key={item.requirementId ?? `${item.documentKind}-${item.schoolYearStart ?? item.templateName}`}>{describeReadinessRequirement(item)}</li>)}</ul> : null}
          <Link className="block text-xs font-semibold text-sky-700" href="/permission-forms">Open Forms workspace</Link>
          {!readiness.documentationReady && !readiness.participationOverrideId ? <OverrideForm eventId={eventId} readiness={readiness} /> : null}
        </div> : <span className="text-slate-500">Unavailable</span>}
      </td>
      <td className="px-3 py-3">
        <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold">
          {registration.registrationStatus}
          {registration.waitlistPosition
            ? ` #${registration.waitlistPosition}`
            : ""}
        </span>
      </td>
      <td className="px-3 py-3 text-right">
        {registration.registrationStatus === "waitlisted" ? (
          <form action={action}>
            <input name="eventId" type="hidden" value={eventId} />
            <input name="registrationId" type="hidden"
              value={registration.registrationId} />
            <button
              className="min-h-11 rounded-lg bg-sky-700 px-4 font-semibold text-white disabled:opacity-60"
              disabled={pending}
            >
              {pending ? "Promoting…" : "Promote"}
            </button>
          </form>
        ) : null}
      </td>
    </tr>
  );
}

function OverrideForm({ eventId, readiness }: Readonly<{ eventId: string; readiness: EventRegistrationReadiness }>) {
  const [state, action, pending] = useActionState(createParticipationOverrideAction, initialState);
  const overrideState = getParticipationOverrideState(readiness.requirements);
  if (!overrideState.eligible) return null;
  return <form action={action} className="space-y-2 pt-2">
    <input name="eventId" type="hidden" value={eventId} />
    <input name="registrationId" type="hidden" value={readiness.registrationId} />
    {overrideState.requirementIds.map((requirementId) => <input key={requirementId} name="requirementId" type="hidden" value={requirementId} />)}
    <input className="min-h-10 w-full rounded border border-slate-300 px-2" name="reason" placeholder="Explicit override reason" required />
    <button className="min-h-10 rounded bg-sky-700 px-3 font-semibold text-white disabled:opacity-60" disabled={pending}>{pending ? "Approving…" : "Approve participation"}</button>
    {state.message ? <p className={`text-xs ${state.success ? "text-emerald-700" : "text-red-700"}`}>{state.message}</p> : null}
  </form>;
}

export function EventRegistrationRoster({
  eventId,
  registrations,
  readiness,
}: Readonly<{
  eventId: string;
  registrations: ManagedEventRegistration[];
  readiness: EventRegistrationReadiness[];
}>) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-semibold text-sky-700">Registration</p>
      <h2 className="mt-1 text-xl font-bold text-slate-950">
        Registration roster
      </h2>
      {registrations.length ? (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-slate-500">
              <tr>
                <th className="px-3 py-2">Student</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Documentation</th>
                <th className="px-3 py-2 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {registrations.map((registration) => (
                <RegistrationRow
                  eventId={eventId}
                  key={registration.registrationId}
                  registration={registration}
                  readiness={readiness.find((item) => item.registrationId === registration.registrationId)}
                />
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="mt-3 text-sm text-slate-600">
          No registrations have been submitted.
        </p>
      )}
    </section>
  );
}
