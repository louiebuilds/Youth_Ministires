"use client";

import { useActionState, useState } from "react";

import {
  addLocationAction,
  addPositionAction,
  assignPositionAction,
  cancelAssignmentAction,
  createRotationAction,
  createScheduleAction,
  generateRotationAction,
  rotationStatusAction,
  scheduleLifecycleAction,
} from "@/features/scheduling/actions/scheduling-actions";

import type {
  Rotation,
  ScheduleRow,
  SchedulingActionState,
  SchedulingCandidate,
  SchedulingEventOption,
} from "@/features/scheduling/types/scheduling";
import { formatDateTimeLocalInTimeZone, formatScheduleDateTime } from "@/features/scheduling/utils/scheduling-datetime";

const initial: SchedulingActionState = { success: false, message: "" };
const input = "mt-1 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 py-2";

function Message({ state }: Readonly<{ state: SchedulingActionState }>) {
  return state.message ? <p className={`rounded-lg px-3 py-2 text-sm ${state.success ? "bg-emerald-50 text-emerald-800" : "bg-rose-50 text-rose-800"}`}>{state.message}</p> : null;
}

export function CreateScheduleForm({ events }: Readonly<{ events: SchedulingEventOption[] }>) {
  const [state, action, pending] = useActionState(createScheduleAction, initial);
  return <form action={action} className="grid gap-4 md:grid-cols-2">
    <label className="text-sm font-semibold">Name<input className={input} name="name" required maxLength={200} /></label>
    <label className="text-sm font-semibold">Ministry context<input className={input} name="ministryContext" maxLength={200} /></label>
    <label className="text-sm font-semibold">Starts<input className={input} name="startsAt" type="datetime-local" required /></label>
    <label className="text-sm font-semibold">Ends<input className={input} name="endsAt" type="datetime-local" required /></label>
    <label className="text-sm font-semibold">Timezone<input className={input} name="timezone" defaultValue="America/Chicago" required /></label>
    <label className="text-sm font-semibold">Linked Event (optional)<select className={input} name="eventId"><option value="">No linked Event</option>{events.map((event) => <option key={event.eventId} value={event.eventId}>{event.eventName} · {formatScheduleDateTime(event.startsAt, event.timezone)} · {event.timezone}</option>)}</select></label>
    <label className="text-sm font-semibold md:col-span-2">Notes<textarea className={`${input} min-h-24`} name="notes" maxLength={1000} /></label>
    <div className="space-y-3 md:col-span-2"><Message state={state} /><button disabled={pending} className="min-h-11 rounded-lg bg-sky-700 px-5 py-2 font-semibold text-white disabled:bg-slate-400">{pending ? "Creating…" : "Create draft schedule"}</button></div>
  </form>;
}

export function ScheduleLocationForm({ scheduleId }: Readonly<{ scheduleId: string }>) {
  const [state, action, pending] = useActionState(addLocationAction, initial);
  return <form action={action} className="space-y-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
    <input type="hidden" name="scheduleId" value={scheduleId} />
    <h2 className="text-lg font-bold">Add location</h2>
    <label className="block text-sm font-semibold">Location name<input className={input} name="name" placeholder="Youth classroom" required /></label>
    <label className="block text-sm font-semibold">Operational note<input className={input} name="notes" placeholder="Optional" /></label>
    <Message state={state} /><button disabled={pending} className="min-h-11 rounded-lg border border-slate-300 px-4 py-2 font-semibold">{pending ? "Adding…" : "Add location"}</button>
  </form>;
}

export function SchedulePositionForm({ locations, scheduleId }: Readonly<{ locations: Array<{ id: string; name: string }>; scheduleId: string }>) {
  const [state, action, pending] = useActionState(addPositionAction, initial);
  return <form action={action} className="space-y-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
    <input type="hidden" name="scheduleId" value={scheduleId} />
    <h2 className="text-lg font-bold">Add required position</h2>
    <label className="block text-sm font-semibold">Responsibility<input className={input} name="responsibility" placeholder="Small-group leader" required /></label>
    <label className="block text-sm font-semibold">Location<select className={input} name="locationId"><option value="">No location</option>{locations.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}</select></label>
    <label className="block text-sm font-semibold">Required volunteers<input className={input} name="requiredCount" type="number" min="1" max="50" defaultValue="1" /></label>
    <Message state={state} /><button disabled={pending} className="min-h-11 rounded-lg border border-slate-300 px-4 py-2 font-semibold">{pending ? "Adding…" : "Add position"}</button>
  </form>;
}

export function ScheduleAssignmentForm({ candidates, position, schedule }: Readonly<{ candidates: SchedulingCandidate[]; position: ScheduleRow; schedule: ScheduleRow }>) {
  const [state, action, pending] = useActionState(assignPositionAction, initial);
  if (!position.positionId) return null;
  return <form action={action} className="space-y-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
    <input type="hidden" name="scheduleId" value={schedule.scheduleId} />
    <input type="hidden" name="positionId" value={position.positionId} />
    <input type="hidden" name="timezone" value={schedule.timezone} />
    <h2 className="text-lg font-bold">Assign {position.responsibility ?? "volunteer"}</h2>
    <p className="text-sm text-slate-600">{position.locationName ?? "No location selected"}</p>
    <label className="block text-sm font-semibold">Volunteer<select className={input} name="profileId" required><option value="">Choose volunteer</option>{candidates.map((candidate) => <option key={candidate.profileId} value={candidate.profileId}>{candidate.displayName}</option>)}</select></label>
    <div className="grid gap-3 sm:grid-cols-2">
      <label className="text-sm font-semibold">Starts<input className={input} name="startsAt" type="datetime-local" required defaultValue={formatDateTimeLocalInTimeZone(schedule.startsAt, schedule.timezone)} /></label>
      <label className="text-sm font-semibold">Ends<input className={input} name="endsAt" type="datetime-local" required defaultValue={formatDateTimeLocalInTimeZone(schedule.endsAt, schedule.timezone)} /></label>
    </div>
    <label className="flex min-h-11 items-center gap-2 text-sm"><input name="override" type="checkbox" />Explicitly override detected conflicts</label>
    <label className="block text-sm font-semibold">Override reason<input className={input} name="overrideReason" placeholder="Required when overriding a conflict" /></label>
    <Message state={state} /><button disabled={pending || candidates.length === 0} className="min-h-11 rounded-lg bg-slate-900 px-4 py-2 font-semibold text-white disabled:bg-slate-400">{pending ? "Assigning…" : candidates.length ? "Assign volunteer" : "No eligible volunteers"}</button>
  </form>;
}

export function ScheduleLifecycleForm({ schedule }: Readonly<{ schedule: ScheduleRow }>) {
  const [state, action, pending] = useActionState(scheduleLifecycleAction, initial);
  return <form action={action} className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
    <input type="hidden" name="scheduleId" value={schedule.scheduleId} />
    <label className="block text-sm font-semibold">Lifecycle action<select className={input} name="status"><option value="published">Publish</option><option value="cancelled">Cancel</option><option value="completed">Complete</option></select></label>
    <label className="flex min-h-11 items-center gap-2 text-sm"><input name="allowUnfilled" type="checkbox" />Publish with known unfilled positions</label>
    <Message state={state} /><button disabled={pending} className="min-h-11 rounded-lg border border-slate-300 px-4 py-2 font-semibold">{pending ? "Applying…" : "Apply lifecycle change"}</button>
  </form>;
}

export function CancelAssignmentForm({ id, scheduleId }: Readonly<{ id: string; scheduleId: string }>) {
  const [state, action, pending] = useActionState(cancelAssignmentAction, initial);
  return <form action={action} className="mt-3"><input type="hidden" name="scheduleId" value={scheduleId} /><input type="hidden" name="assignmentId" value={id} /><button disabled={pending} className="min-h-11 text-sm font-semibold text-rose-700">{pending ? "Cancelling…" : "Cancel assignment"}</button><Message state={state} /></form>;
}

const weekdays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function CreateRotationForm({ candidates }: Readonly<{ candidates: SchedulingCandidate[] }>) {
  const [state, action, pending] = useActionState(createRotationAction, initial);
  const [pattern, setPattern] = useState("weekly");
  return <form action={action} className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
    <label className="text-sm font-semibold">Rotation name<input className={input} name="name" required /></label>
    <label className="text-sm font-semibold">Pattern<select className={input} name="pattern" value={pattern} onChange={(event) => setPattern(event.target.value)}><option value="weekly">Weekly</option><option value="biweekly">Every other week</option><option value="monthly">Monthly ordinal</option></select></label>
    <label className="text-sm font-semibold">Weekday<select className={input} name="weekday">{weekdays.map((day, index) => <option key={day} value={index}>{day}</option>)}</select></label>
    {pattern === "monthly" ? <label className="text-sm font-semibold">Week of month<select className={input} name="monthlyOrdinal" required><option value="1">First</option><option value="2">Second</option><option value="3">Third</option><option value="4">Fourth</option><option value="5">Fifth</option></select></label> : <input name="monthlyOrdinal" type="hidden" value="" />}
    <label className="text-sm font-semibold">Start date<input className={input} name="startsOn" type="date" required /></label>
    <label className="text-sm font-semibold">Optional end date<input className={input} name="endsOn" type="date" /></label>
    <label className="text-sm font-semibold">Start time<input className={input} name="startsAt" type="time" required /></label>
    <label className="text-sm font-semibold">End time<input className={input} name="endsAt" type="time" required /></label>
    <label className="text-sm font-semibold">Timezone<input className={input} name="timezone" defaultValue="America/Chicago" required /></label>
    <label className="text-sm font-semibold">Generated schedule name<input className={input} name="scheduleName" required /></label>
    <label className="text-sm font-semibold">Responsibility<input className={input} name="responsibility" required /></label>
    <label className="text-sm font-semibold">Location<input className={input} name="locationName" /></label>
    <label className="text-sm font-semibold">Ministry context<input className={input} name="ministryContext" /></label>
    <label className="text-sm font-semibold">Volunteer<select className={input} name="profileId"><option value="">Leave unfilled</option>{candidates.map((candidate) => <option key={candidate.profileId} value={candidate.profileId}>{candidate.displayName}</option>)}</select></label>
    <div className="space-y-3 md:col-span-2 lg:col-span-3"><Message state={state} /><button disabled={pending} className="min-h-11 rounded-lg bg-sky-700 px-5 py-2 font-semibold text-white disabled:bg-slate-400">{pending ? "Creating…" : "Create rotation"}</button></div>
  </form>;
}

export function RotationControls({ rotation }: Readonly<{ rotation: Rotation }>) {
  const [statusState, statusAction, statusPending] = useActionState(rotationStatusAction, initial);
  const [generationState, generationAction, generationPending] = useActionState(generateRotationAction, initial);
  return <div className="mt-4 grid gap-4 md:grid-cols-2">
    <form action={statusAction} className="space-y-2"><input type="hidden" name="rotationId" value={rotation.id} /><label className="block text-sm font-semibold">Status<select className={input} name="status" defaultValue={rotation.status === "paused" ? "active" : "paused"}><option value="active">Resume</option><option value="paused">Pause</option><option value="ended">End</option></select></label><button disabled={statusPending} className="min-h-11 rounded-lg border px-3 font-semibold">Change status</button><Message state={statusState} /></form>
    <form action={generationAction} className="space-y-2"><input type="hidden" name="rotationId" value={rotation.id} /><label className="block text-sm font-semibold">Generate through<input className={input} name="through" type="date" required /></label><button disabled={generationPending || rotation.status !== "active"} className="min-h-11 rounded-lg border px-3 font-semibold">Generate future occurrences</button><Message state={generationState} /></form>
  </div>;
}
