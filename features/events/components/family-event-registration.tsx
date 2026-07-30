"use client";

import { useActionState } from "react";

import {
  cancelMyEventRegistrationAction,
  registerMyStudentForEventAction,
} from "@/features/events/actions/event-management-actions";

import type {
  EventActionState,
  EventRegistrationOption,
} from "@/features/events/types/event-management";

const initialState: EventActionState = { success: false };

function RegistrationRow({
  eventId,
  option,
}: Readonly<{
  eventId: string;
  option: EventRegistrationOption;
}>) {
  const [registerState, registerAction, registering] = useActionState(
    registerMyStudentForEventAction,
    initialState,
  );
  const [cancelState, cancelAction, cancelling] = useActionState(
    cancelMyEventRegistrationAction,
    initialState,
  );

  const activeRegistration = option.registrationStatus &&
    ["registered", "waitlisted", "confirmed"].includes(
      option.registrationStatus,
    );

  const message = cancelState.message ?? registerState.message;
  const successful = cancelState.message
    ? cancelState.success
    : registerState.success;

  return (
    <article className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-bold text-slate-950">
            {option.studentName}
          </h3>
          <p className="text-sm text-slate-600">
            {option.householdName}
          </p>
        </div>

        {option.registrationStatus &&
        option.registrationStatus !== "cancelled" ? (
          <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold">
            {option.registrationStatus}
          </span>
        ) : null}
      </div>

      <div className="mt-4">
        {activeRegistration && option.registrationId ? (
          <form action={cancelAction}>
            <input name="eventId" type="hidden" value={eventId} />
            <input
              name="registrationId"
              type="hidden"
              value={option.registrationId}
            />
            <button
              className="min-h-11 rounded-lg border border-red-300 bg-white px-4 font-semibold text-red-800 disabled:opacity-60"
              disabled={cancelling}
            >
              {cancelling ? "Cancelling…" : "Cancel registration"}
            </button>
          </form>
        ) : (
          <form action={registerAction}>
            <input name="eventId" type="hidden" value={eventId} />
            <input
              name="studentId"
              type="hidden"
              value={option.studentId}
            />
            <button
              className="min-h-11 rounded-lg bg-sky-700 px-4 font-semibold text-white disabled:opacity-60"
              disabled={registering}
            >
              {registering ? "Registering…" : "Register student"}
            </button>
          </form>
        )}
      </div>

      {message ? (
        <p
          className={`mt-3 text-sm font-semibold ${
            successful ? "text-emerald-700" : "text-red-700"
          }`}
          role="status"
        >
          {message}
        </p>
      ) : null}
    </article>
  );
}

export function FamilyEventRegistration({
  eventId,
  options,
}: Readonly<{
  eventId: string;
  options: EventRegistrationOption[];
}>) {
  if (options.length === 0) return null;

  return (
    <section className="space-y-4 rounded-xl border border-slate-200 bg-slate-50 p-5">
      <div>
        <p className="text-sm font-semibold text-sky-700">
          Family registration
        </p>
        <h2 className="mt-1 text-xl font-bold text-slate-950">
          Register your students
        </h2>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {options.map((option) => (
          <RegistrationRow
            eventId={eventId}
            key={option.studentId}
            option={option}
          />
        ))}
      </div>
    </section>
  );
}