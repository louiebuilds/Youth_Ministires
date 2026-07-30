"use client";

import { useActionState } from "react";

import {
  archiveEventAction,
  createEventAction,
  updateEventAction,
} from "@/features/events/actions/event-management-actions";

import type {
  EventActionState,
  EventWorkspace,
} from "@/features/events/types/event-management";

const initialState: EventActionState = { success: false };
const inputClass =
  "mt-1 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 outline-none focus:border-sky-600 focus:ring-3 focus:ring-sky-100";

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

export function EventManagementForm({
  event,
}: Readonly<{ event?: EventWorkspace }>) {
  const action = event ? updateEventAction : createEventAction;
  const [state, formAction, pending] = useActionState(action, initialState);
  const timezone = event?.timezone ?? "America/Chicago";
  return (
    <form action={formAction} className="space-y-5">
      {event ? <input name="eventId" type="hidden" value={event.eventId} /> : null}
      <div className="grid gap-4 md:grid-cols-2">
        <label className="text-sm font-semibold text-slate-700">
          Event name
          <input className={inputClass} defaultValue={event?.name ?? ""}
            maxLength={200} name="name" required />
        </label>
        <label className="text-sm font-semibold text-slate-700">
          Event type
          <input className={inputClass} defaultValue={event?.eventType ?? ""}
            maxLength={100} name="eventType" placeholder="Youth Night, Retreat…" required />
        </label>
        <label className="text-sm font-semibold text-slate-700">
          Status
          <select className={inputClass} defaultValue={event?.status ?? "draft"} name="status">
            <option value="draft">Draft</option>
            <option value="published">Published</option>
            <option value="active">Active</option>
            <option value="completed">Completed</option>
          </select>
        </label>
        <label className="text-sm font-semibold text-slate-700">
          Capacity
          <input className={inputClass} defaultValue={event?.capacity ?? ""}
            max={100000} min={0} name="capacity" type="number" />
        </label>
        <label className="text-sm font-semibold text-slate-700">
          Starts
          <input className={inputClass}
            defaultValue={event ? localDateTime(event.startsAt, timezone) : ""}
            name="startsAt" required type="datetime-local" />
        </label>
        <label className="text-sm font-semibold text-slate-700">
          Ends
          <input className={inputClass}
            defaultValue={event ? localDateTime(event.endsAt, timezone) : ""}
            name="endsAt" required type="datetime-local" />
        </label>
        <label className="text-sm font-semibold text-slate-700">
          Time zone
          <input className={inputClass} defaultValue={timezone}
            maxLength={100} name="timezone" required />
        </label>
        <label className="text-sm font-semibold text-slate-700">
          Campus
          <input className={inputClass} defaultValue={event?.campus ?? ""}
            maxLength={150} name="campus" />
        </label>
        <label className="text-sm font-semibold text-slate-700">
          Building
          <input className={inputClass} defaultValue={event?.building ?? ""}
            maxLength={150} name="building" />
        </label>
        <label className="text-sm font-semibold text-slate-700">
          Room
          <input className={inputClass} defaultValue={event?.room ?? ""}
            maxLength={100} name="room" />
        </label>
      </div>
      <label className="block text-sm font-semibold text-slate-700">
        Address
        <input className={inputClass} defaultValue={event?.address ?? ""}
          maxLength={300} name="address" />
      </label>
      <label className="block text-sm font-semibold text-slate-700">
        Description
        <textarea className={inputClass} defaultValue={event?.description ?? ""}
          maxLength={4000} name="description" rows={4} />
      </label>
      <label className="block text-sm font-semibold text-slate-700">
        Meeting instructions
        <textarea className={inputClass}
          defaultValue={event?.meetingInstructions ?? ""}
          maxLength={2000} name="meetingInstructions" rows={3} />
      </label>
      {state.message ? (
        <p className={`rounded-lg border p-3 text-sm font-semibold ${
          state.success
            ? "border-emerald-200 bg-emerald-50 text-emerald-900"
            : "border-red-200 bg-red-50 text-red-800"
        }`} role="status">
          {state.message}
        </p>
      ) : null}
      <button className="min-h-11 rounded-lg bg-sky-700 px-5 font-semibold text-white disabled:opacity-60"
        disabled={pending}>
        {pending ? "Saving…" : event ? "Save event" : "Create event"}
      </button>
    </form>
  );
}

export function ArchiveEventForm({
  eventId,
}: Readonly<{ eventId: string }>) {
  const [state, action, pending] = useActionState(
    archiveEventAction,
    initialState,
  );
  return (
    <form action={action} className="space-y-3">
      <input name="eventId" type="hidden" value={eventId} />
      <p className="text-sm text-slate-600">
        Archived events remain in history and cannot be edited.
      </p>
      {state.message ? <p className="text-sm font-semibold text-red-700">{state.message}</p> : null}
      <button className="min-h-11 rounded-lg border border-red-300 bg-white px-4 font-semibold text-red-800 disabled:opacity-60"
        disabled={pending}>
        {pending ? "Archiving…" : "Archive event"}
      </button>
    </form>
  );
}
