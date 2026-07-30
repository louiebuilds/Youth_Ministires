"use client";

import { useActionState } from "react";

import {
  scheduleEventVolunteerAction,
  updateEventVolunteerStatusAction,
} from "@/features/events/actions/event-management-actions";

import type {
  EventActionState,
  EventVolunteerAssignment,
  EventVolunteerCandidate,
} from "@/features/events/types/event-management";

const initialState: EventActionState = { success: false };
const inputClass =
  "mt-1 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm";

function AssignmentRow({
  assignment,
  eventId,
}: Readonly<{
  assignment: EventVolunteerAssignment;
  eventId: string;
}>) {
  const [state, action, pending] = useActionState(
    updateEventVolunteerStatusAction,
    initialState,
  );
  return (
    <li className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-bold text-slate-950">{assignment.displayName}</h3>
          <p className="text-sm text-slate-600">{assignment.assignmentRole}</p>
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold">
          {assignment.assignmentStatus}
        </span>
      </div>
      <form action={action} className="mt-4 flex flex-wrap items-end gap-3">
        <input name="eventId" type="hidden" value={eventId} />
        <input name="assignmentId" type="hidden"
          value={assignment.assignmentId} />
        <label className="text-sm font-semibold text-slate-700">
          Status
          <select className={inputClass}
            defaultValue={assignment.assignmentStatus} name="status">
            <option value="assigned">Assigned</option>
            <option value="confirmed">Confirmed</option>
            <option value="declined">Declined</option>
            <option value="cancelled">Cancelled</option>
            <option value="completed">Completed</option>
          </select>
        </label>
        <button className="min-h-11 rounded-lg bg-slate-900 px-4 font-semibold text-white disabled:opacity-60"
          disabled={pending}>
          {pending ? "Updating…" : "Update status"}
        </button>
      </form>
      {state.message ? (
        <p className={`mt-3 text-sm font-semibold ${
          state.success ? "text-emerald-700" : "text-red-700"
        }`}>{state.message}</p>
      ) : null}
    </li>
  );
}

export function EventVolunteerAssignments({
  assignments,
  candidates,
  eventId,
}: Readonly<{
  assignments: EventVolunteerAssignment[];
  candidates: EventVolunteerCandidate[];
  eventId: string;
}>) {
  const [state, action, pending] = useActionState(
    scheduleEventVolunteerAction,
    initialState,
  );
  return (
    <section className="space-y-5 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div>
        <p className="text-sm font-semibold text-sky-700">Serving team</p>
        <h2 className="mt-1 text-xl font-bold text-slate-950">
          Volunteer assignments
        </h2>
      </div>
      <form action={action} className="grid gap-4 md:grid-cols-3">
        <input name="eventId" type="hidden" value={eventId} />
        <label className="text-sm font-semibold text-slate-700 md:col-span-2">
          Volunteer
          <select className={inputClass} name="profileId" required>
            <option value="">Select a volunteer</option>
            {candidates.map((candidate) => (
              <option key={candidate.profileId} value={candidate.profileId}>
                {candidate.displayName}
                {candidate.ministryTitle ? ` · ${candidate.ministryTitle}` : ""}
                {` · ${candidate.backgroundCheckStatus.replaceAll("_", " ")}`}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm font-semibold text-slate-700">
          Assignment role
          <input className={inputClass} maxLength={100}
            name="assignmentRole" placeholder="Small Group Leader" required />
        </label>
        <div className="md:col-span-3">
          <button className="min-h-11 rounded-lg bg-sky-700 px-4 font-semibold text-white disabled:opacity-60"
            disabled={pending || candidates.length === 0}>
            {pending ? "Assigning…" : candidates.length
              ? "Assign volunteer" : "No available volunteers"}
          </button>
          {state.message ? (
            <p className={`mt-3 text-sm font-semibold ${
              state.success ? "text-emerald-700" : "text-red-700"
            }`}>{state.message}</p>
          ) : null}
        </div>
      </form>
      {assignments.length ? (
        <ul className="grid gap-4 md:grid-cols-2">
          {assignments.map((assignment) => (
            <AssignmentRow assignment={assignment} eventId={eventId}
              key={assignment.assignmentId} />
          ))}
        </ul>
      ) : (
        <p className="text-sm text-slate-600">No volunteers assigned.</p>
      )}
    </section>
  );
}
