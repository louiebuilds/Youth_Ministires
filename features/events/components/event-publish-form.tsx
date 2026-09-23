"use client";

import { useActionState } from "react";

import { updateEventAction } from "@/features/events/actions/event-management-actions";

import type { EventActionState, EventWorkspace } from "@/features/events/types/event-management";

const initialState: EventActionState = { success: false };

function localDateTime(value: string, timezone: string) {
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

export function EventPublishForm({ event }: Readonly<{ event: EventWorkspace }>) {
  const [state, action, pending] = useActionState(updateEventAction, initialState);
  return (
    <form action={action} className="flex flex-col items-end gap-2">
      <input name="eventId" type="hidden" value={event.eventId} />
      <input name="name" type="hidden" value={event.name} />
      <input name="eventType" type="hidden" value={event.eventType} />
      <input name="status" type="hidden" value="published" />
      <input name="description" type="hidden" value={event.description ?? ""} />
      <input name="startsAt" type="hidden" value={localDateTime(event.startsAt, event.timezone)} />
      <input name="endsAt" type="hidden" value={localDateTime(event.endsAt, event.timezone)} />
      <input name="timezone" type="hidden" value={event.timezone} />
      <input name="capacity" type="hidden" value={event.capacity ?? ""} />
      <input name="campus" type="hidden" value={event.campus ?? ""} />
      <input name="building" type="hidden" value={event.building ?? ""} />
      <input name="room" type="hidden" value={event.room ?? ""} />
      <input name="address" type="hidden" value={event.address ?? ""} />
      <input name="meetingInstructions" type="hidden" value={event.meetingInstructions ?? ""} />
      <button className="min-h-11 rounded-lg bg-sky-700 px-5 font-semibold text-white disabled:opacity-60" disabled={pending}>
        {pending ? "Publishing…" : "Publish event"}
      </button>
      {state.message ? (
        <p className={`max-w-sm text-right text-sm font-semibold ${state.success ? "text-emerald-700" : "text-red-700"}`} role="status">
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
