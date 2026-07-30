"use client";

import { useActionState } from "react";

import { updateEventRegistrationSettingsAction } from "@/features/events/actions/event-management-actions";

import type {
  EventActionState,
  EventRegistrationSettings,
} from "@/features/events/types/event-management";

const initialState: EventActionState = { success: false };
const inputClass =
  "mt-1 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 outline-none focus:border-sky-600 focus:ring-3 focus:ring-sky-100";

function localDateTime(value: string | null, timezone: string) {
  if (!value) return "";
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(value));
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((item) => item.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}T${part("hour")}:${part("minute")}`;
}

export function EventRegistrationSettingsForm({
  settings,
  timezone,
}: Readonly<{
  settings: EventRegistrationSettings;
  timezone: string;
}>) {
  const [state, action, pending] = useActionState(
    updateEventRegistrationSettingsAction,
    initialState,
  );
  return (
    <form action={action} className="space-y-5">
      <input name="eventId" type="hidden" value={settings.eventId} />
      <div className="grid gap-4 md:grid-cols-2">
        <label className="text-sm font-semibold text-slate-700">
          Registration capacity
          <input className={inputClass} defaultValue={settings.capacity ?? ""}
            max={100000} min={0} name="capacity" type="number" />
        </label>
        <label className="text-sm font-semibold text-slate-700">
          Waitlist capacity
          <input className={inputClass}
            defaultValue={settings.waitlistCapacity ?? ""}
            max={100000} min={0} name="waitlistCapacity" type="number" />
        </label>
        <label className="text-sm font-semibold text-slate-700">
          Registration opens
          <input className={inputClass}
            defaultValue={localDateTime(settings.registrationOpensAt, timezone)}
            name="registrationOpensAt" type="datetime-local" />
        </label>
        <label className="text-sm font-semibold text-slate-700">
          Registration closes
          <input className={inputClass}
            defaultValue={localDateTime(settings.registrationClosesAt, timezone)}
            name="registrationClosesAt" type="datetime-local" />
        </label>
      </div>
      <p className="text-sm text-slate-600">
        Times use the event time zone: {timezone}. Leave both dates blank to
        remove the registration window.
      </p>
      {state.message ? (
        <p className={`rounded-lg border p-3 text-sm font-semibold ${
          state.success
            ? "border-emerald-200 bg-emerald-50 text-emerald-900"
            : "border-red-200 bg-red-50 text-red-800"
        }`} role="status">
          {state.message}
        </p>
      ) : null}
      <button
        className="min-h-11 rounded-lg bg-sky-700 px-5 font-semibold text-white disabled:opacity-60"
        disabled={pending}
      >
        {pending ? "Saving…" : "Save registration settings"}
      </button>
    </form>
  );
}
