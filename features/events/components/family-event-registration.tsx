"use client";

import { useActionState } from "react";

import { manageEventRegistrationAction } from "@/features/events/actions/event-management-actions";

import type {
  EventActionState,
  EventRegistrationOption,
} from "@/features/events/types/event-management";

const initialState: EventActionState = {
  success: false,
};

function isActiveRegistration(
  option: EventRegistrationOption,
) {
  return Boolean(
    option.registrationStatus &&
      ["registered", "waitlisted", "confirmed"].includes(
        option.registrationStatus,
      ),
  );
}

function RegistrationRow({
  eventId,
  managerMode,
  option,
}: Readonly<{
  eventId: string;
  managerMode: boolean;
  option: EventRegistrationOption;
}>) {
  const [state, action, pending] = useActionState(
    manageEventRegistrationAction,
    initialState,
  );

  const activeRegistration =
    isActiveRegistration(option);

  return (
    <div className="border-t border-slate-200 px-4 py-3 first:border-t-0">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="font-semibold text-slate-950">
            {option.studentName}
          </p>

          <p className="text-sm text-slate-500">
            {option.householdName}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {activeRegistration ? (
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold capitalize text-slate-700">
              {option.registrationStatus}
            </span>
          ) : null}

          {activeRegistration &&
          option.registrationId ? (
            managerMode ? null : (
              <form action={action}>
                <input
                  name="intent"
                  type="hidden"
                  value="cancel"
                />

                <input
                  name="eventId"
                  type="hidden"
                  value={eventId}
                />

                <input
                  name="registrationId"
                  type="hidden"
                  value={option.registrationId}
                />

                <button
                  className="min-h-10 rounded-lg border border-red-300 bg-white px-3 text-sm font-semibold text-red-800 disabled:opacity-60"
                  disabled={pending}
                >
                  {pending
                    ? "Cancelling…"
                    : "Cancel registration"}
                </button>
              </form>
            )
          ) : (
            <form action={action}>
              <input
                name="intent"
                type="hidden"
                value="register"
              />

              <input
                name="eventId"
                type="hidden"
                value={eventId}
              />

              <input
                name="studentId"
                type="hidden"
                value={option.studentId}
              />

              <button
                className="min-h-10 rounded-lg bg-sky-700 px-3 text-sm font-semibold text-white disabled:opacity-60"
                disabled={pending}
              >
                {pending
                  ? "Registering…"
                  : "Register student"}
              </button>
            </form>
          )}
        </div>
      </div>

      {state.message ? (
        <p
          className={`mt-2 text-sm font-semibold ${
            state.success
              ? "text-emerald-700"
              : "text-red-700"
          }`}
          role="status"
        >
          {state.message}
        </p>
      ) : null}
    </div>
  );
}

export function FamilyEventRegistration({
  eventId,
  managerMode = false,
  options,
}: Readonly<{
  eventId: string;
  managerMode?: boolean;
  options: EventRegistrationOption[];
}>) {
  if (options.length === 0) {
    return null;
  }

  const visibleOptions = managerMode
    ? options.filter(
        (option) =>
          !isActiveRegistration(option),
      )
    : options;

  if (!visibleOptions.length && !managerMode) {
    return null;
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <details>
        <summary className="cursor-pointer list-none px-5 py-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-sky-700">
                {managerMode
                  ? "Event registration management"
                  : "Family registration"}
              </p>

              <h2 className="mt-1 text-lg font-bold text-slate-950">
                {managerMode
                  ? "Add registrations"
                  : "Manage registrations"}
              </h2>
            </div>

            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
              {managerMode
                ? `${visibleOptions.length} available`
                : `${options.length} student${
                    options.length === 1
                      ? ""
                      : "s"
                  }`}
            </span>
          </div>
        </summary>

        <div className="border-t border-slate-200">
          {visibleOptions.length ? (
            <div className="divide-y divide-slate-200">
              {visibleOptions.map(
                (option) => (
                  <RegistrationRow
                    eventId={eventId}
                    key={option.studentId}
                    managerMode={
                      managerMode
                    }
                    option={option}
                  />
                ),
              )}
            </div>
          ) : (
            <p className="p-5 text-sm text-slate-600">
              All available students are already
              registered for this event.
            </p>
          )}
        </div>
      </details>
    </section>
  );
}