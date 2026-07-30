"use client";

import { useActionState } from "react";

import { promoteWaitlistedRegistrationAction } from "@/features/events/actions/event-management-actions";

import type {
  EventActionState,
  ManagedEventRegistration,
} from "@/features/events/types/event-management";

const initialState: EventActionState = { success: false };

function RegistrationRow({
  eventId,
  registration,
}: Readonly<{
  eventId: string;
  registration: ManagedEventRegistration;
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

export function EventRegistrationRoster({
  eventId,
  registrations,
}: Readonly<{
  eventId: string;
  registrations: ManagedEventRegistration[];
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
                <th className="px-3 py-2 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {registrations.map((registration) => (
                <RegistrationRow
                  eventId={eventId}
                  key={registration.registrationId}
                  registration={registration}
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
