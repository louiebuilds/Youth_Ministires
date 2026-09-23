"use client";

import { useActionState } from "react";

import {
  createSkillAction,
  saveAvailabilityAction,
  saveCertificationAction,
  saveSkillAssignmentAction,
  saveVolunteerProfileAction,
  scheduleVolunteerAction,
  setAssignmentStatusAction,
} from "@/features/volunteers/actions/volunteer-management-actions";

import type {
  SchedulableEvent,
  VolunteerAssignment,
  VolunteerWorkspace,
} from "@/features/volunteers/types/volunteer-management";

const initialState = { success: false } as const;

const inputClass =
  "mt-1 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 outline-none focus:border-sky-600 focus:ring-3 focus:ring-sky-100";

function Message({
  state,
}: Readonly<{ state: { success: boolean; message?: string } }>) {
  return state.message ? (
    <p
      className={`rounded-lg border px-3 py-2 text-sm ${
        state.success
          ? "border-emerald-200 bg-emerald-50 text-emerald-900"
          : "border-red-200 bg-red-50 text-red-800"
      }`}
    >
      {state.message}
    </p>
  ) : null;
}

export function NewVolunteerForm({
  candidates,
}: Readonly<{
  candidates: {
    profile_id: string;
    display_name: string;
    primary_role: string;
  }[];
}>) {
  const [state, action, pending] = useActionState(
    saveVolunteerProfileAction,
    initialState,
  );

  return (
    <form
      action={action}
      className="grid gap-4 rounded-xl border border-sky-200 bg-sky-50/50 p-5 md:grid-cols-2"
    >
      <input name="backgroundCheckStatus" type="hidden" value="pending" />
      <input name="backgroundCheckCompletedAt" type="hidden" value="" />
      <input name="backgroundCheckExpiresAt" type="hidden" value="" />
      <input name="backgroundCheckReference" type="hidden" value="" />
      <input name="isActive" type="hidden" value="on" />

      <label className="text-sm font-medium text-slate-800">
        Account
        <select className={inputClass} name="profileId" required>
          <option value="">Select an active account</option>
          {candidates.map((candidate) => (
            <option key={candidate.profile_id} value={candidate.profile_id}>
              {candidate.display_name} ·{" "}
              {candidate.primary_role.replaceAll("_", " ")}
            </option>
          ))}
        </select>
      </label>

      <label className="text-sm font-medium text-slate-800">
        Ministry title
        <input
          className={inputClass}
          maxLength={100}
          name="ministryTitle"
          placeholder="Small Group Leader"
        />
      </label>

      <div className="space-y-3 md:col-span-2">
        <Message state={state} />
        <button
          className="min-h-11 rounded-lg bg-sky-700 px-4 py-2 text-sm font-semibold text-white disabled:bg-slate-400"
          disabled={pending}
        >
          {pending ? "Saving…" : "Add volunteer profile"}
        </button>
      </div>
    </form>
  );
}

export function VolunteerProfileForm({
  volunteer,
}: Readonly<{ volunteer: VolunteerWorkspace }>) {
  const [state, action, pending] = useActionState(
    saveVolunteerProfileAction,
    initialState,
  );

  return (
    <form action={action} className="space-y-4">
      <input name="profileId" type="hidden" value={volunteer.profileId} />

      <div className="grid gap-4 md:grid-cols-2">
        <label className="text-sm font-medium text-slate-800">
          Ministry title
          <input
            className={inputClass}
            defaultValue={volunteer.ministryTitle ?? ""}
            maxLength={100}
            name="ministryTitle"
          />
        </label>

        <label className="text-sm font-medium text-slate-800">
          Background check status
          <select
            className={inputClass}
            defaultValue={volunteer.backgroundCheckStatus}
            name="backgroundCheckStatus"
          >
            <option value="not_required">Not required</option>
            <option value="pending">Pending</option>
            <option value="cleared">Cleared</option>
            <option value="review_required">Review required</option>
            <option value="expired">Expired</option>
          </select>
        </label>

        <label className="text-sm font-medium text-slate-800">
          Completed
          <input
            className={inputClass}
            defaultValue={volunteer.backgroundCheckCompletedAt ?? ""}
            name="backgroundCheckCompletedAt"
            type="date"
          />
        </label>

        <label className="text-sm font-medium text-slate-800">
          Expires
          <input
            className={inputClass}
            defaultValue={volunteer.backgroundCheckExpiresAt ?? ""}
            name="backgroundCheckExpiresAt"
            type="date"
          />
        </label>

        <label className="text-sm font-medium text-slate-800">
          Provider reference
          <input
            className={inputClass}
            defaultValue={volunteer.backgroundCheckReference ?? ""}
            maxLength={100}
            name="backgroundCheckReference"
          />
        </label>

        <label className="flex items-center gap-2 self-end pb-3 text-sm font-medium text-slate-800">
          <input
            defaultChecked={volunteer.isActive}
            name="isActive"
            type="checkbox"
          />
          Active volunteer profile
        </label>
      </div>

      <p className="text-xs text-slate-500">
        Store a provider reference only—never reports, identity documents, or
        government identifiers.
      </p>

      <Message state={state} />

      <button
        className="min-h-11 rounded-lg bg-sky-700 px-4 py-2 text-sm font-semibold text-white disabled:bg-slate-400"
        disabled={pending}
      >
        {pending ? "Saving…" : "Save profile"}
      </button>
    </form>
  );
}

export function CertificationForm({
  profileId,
}: Readonly<{ profileId: string }>) {
  const [state, action, pending] = useActionState(
    saveCertificationAction,
    initialState,
  );

  return (
    <form
      action={action}
      className="grid gap-3 rounded-lg border border-slate-200 p-4 md:grid-cols-2"
    >
      <input name="profileId" type="hidden" value={profileId} />
      <input name="id" type="hidden" value="" />

      <label className="text-sm font-medium">
        Certification
        <input
          className={inputClass}
          maxLength={100}
          name="name"
          required
        />
      </label>

      <label className="text-sm font-medium">
        Issuer
        <input className={inputClass} maxLength={100} name="issuer" />
      </label>

      <label className="text-sm font-medium">
        Issued
        <input className={inputClass} name="issuedAt" type="date" />
      </label>

      <label className="text-sm font-medium">
        Expires
        <input className={inputClass} name="expiresAt" type="date" />
      </label>

      <label className="text-sm font-medium">
        Status
        <select className={inputClass} name="status">
          <option value="active">Active</option>
          <option value="expired">Expired</option>
          <option value="revoked">Revoked</option>
        </select>
      </label>

      <label className="text-sm font-medium">
        Reference
        <input className={inputClass} maxLength={100} name="reference" />
      </label>

      <div className="space-y-3 md:col-span-2">
        <Message state={state} />

        <button
          className="min-h-11 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:bg-slate-400"
          disabled={pending}
        >
          {pending ? "Saving…" : "Add certification"}
        </button>
      </div>
    </form>
  );
}

export function SkillAssignmentForm({
  profileId,
  skills,
}: Readonly<{
  profileId: string;
  skills: { id: string; name: string }[];
}>) {
  const [assignmentState, assignmentAction, assignmentPending] =
    useActionState(saveSkillAssignmentAction, initialState);

  const hasSkills = skills.length > 0;

  return (
    <form
      action={assignmentAction}
      className="space-y-3 rounded-lg border border-slate-200 p-4"
    >
      <input name="profileId" type="hidden" value={profileId} />

      <label
        className="text-sm font-medium"
        htmlFor="volunteer-skill-id"
      >
        Skill
      </label>

      <select
        className={inputClass}
        disabled={!hasSkills}
        id="volunteer-skill-id"
        name="skillId"
        required
      >
        <option value="">Select a skill</option>
        {skills.map((skill) => (
          <option key={skill.id} value={skill.id}>
            {skill.name}
          </option>
        ))}
      </select>

      {!hasSkills ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          No ministry-wide skill options have been created. Create a skill
          option from the Volunteer directory first.
        </p>
      ) : null}

      <label
        className="text-sm font-medium"
        htmlFor="volunteer-skill-level"
      >
        Level
      </label>

      <select
        className={inputClass}
        defaultValue="interested"
        disabled={!hasSkills}
        id="volunteer-skill-level"
        name="skillLevel"
      >
        <option value="interested">Interested</option>
        <option value="beginner">Beginner</option>
        <option value="proficient">Proficient</option>
        <option value="advanced">Advanced</option>
      </select>

      <label
        className="text-sm font-medium"
        htmlFor="volunteer-skill-notes"
      >
        Notes
      </label>

      <textarea
        className={inputClass}
        disabled={!hasSkills}
        id="volunteer-skill-notes"
        maxLength={500}
        name="notes"
        rows={2}
      />

      <Message state={assignmentState} />

      <button
        className="min-h-11 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:bg-slate-400"
        disabled={assignmentPending || !hasSkills}
      >
        {assignmentPending ? "Saving…" : "Save skill"}
      </button>
    </form>
  );
}

export function SkillCatalogForm() {
  const [skillState, skillAction, skillPending] = useActionState(
    createSkillAction,
    initialState,
  );

  return (
    <form
      action={skillAction}
      className="space-y-3 rounded-lg border border-slate-200 p-4"
    >
      <h3 className="font-semibold text-slate-950">
        Create skill option
      </h3>

      <label className="text-sm font-medium">
        Name
        <input
          className={inputClass}
          maxLength={60}
          name="name"
          required
        />
      </label>

      <label className="text-sm font-medium">
        Description
        <textarea
          className={inputClass}
          maxLength={300}
          name="description"
          rows={2}
        />
      </label>

      <Message state={skillState} />

      <button
        className="min-h-11 rounded-lg bg-sky-700 px-4 py-2 text-sm font-semibold text-white disabled:bg-slate-400"
        disabled={skillPending}
      >
        {skillPending ? "Saving…" : "Create skill"}
      </button>
    </form>
  );
}

export function AvailabilityForm({
  profileId,
}: Readonly<{ profileId: string }>) {
  const [state, action, pending] = useActionState(
    saveAvailabilityAction,
    initialState,
  );

  return (
    <form
      action={action}
      className="grid gap-3 rounded-lg border border-slate-200 p-4 md:grid-cols-3"
    >
      <input name="profileId" type="hidden" value={profileId} />
      <input name="id" type="hidden" value="" />

      <label className="text-sm font-medium">
        Day
        <select className={inputClass} name="dayOfWeek">
          {[
            "Sunday",
            "Monday",
            "Tuesday",
            "Wednesday",
            "Thursday",
            "Friday",
            "Saturday",
          ].map((day, index) => (
            <option key={day} value={index}>
              {day}
            </option>
          ))}
        </select>
      </label>

      <label className="text-sm font-medium">
        Starts
        <input className={inputClass} name="startsAt" required type="time" />
      </label>

      <label className="text-sm font-medium">
        Ends
        <input className={inputClass} name="endsAt" required type="time" />
      </label>

      <label className="text-sm font-medium">
        Timezone
        <input
          className={inputClass}
          defaultValue="America/Chicago"
          name="timezone"
          required
        />
      </label>

      <label className="text-sm font-medium">
        Effective from
        <input
          className={inputClass}
          defaultValue="2026-07-26"
          name="effectiveFrom"
          required
          type="date"
        />
      </label>

      <label className="text-sm font-medium">
        Effective until
        <input className={inputClass} name="effectiveUntil" type="date" />
      </label>

      <label className="text-sm font-medium md:col-span-3">
        Notes
        <textarea
          className={inputClass}
          maxLength={500}
          name="notes"
          rows={2}
        />
      </label>

      <div className="space-y-3 md:col-span-3">
        <Message state={state} />

        <button
          className="min-h-11 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:bg-slate-400"
          disabled={pending}
        >
          {pending ? "Saving…" : "Add availability"}
        </button>
      </div>
    </form>
  );
}

export function ScheduleVolunteerForm({
  events,
  profileId,
}: Readonly<{
  events: SchedulableEvent[];
  profileId: string;
}>) {
  const [state, action, pending] = useActionState(
    scheduleVolunteerAction,
    initialState,
  );

  return (
    <form
      action={action}
      className="grid gap-3 rounded-lg border border-slate-200 p-4 md:grid-cols-2"
    >
      <input name="profileId" type="hidden" value={profileId} />

      <label className="text-sm font-medium">
        Existing event
        <select className={inputClass} name="eventId" required>
          <option value="">Select an event</option>
          {events.map((event) => (
            <option key={event.eventId} value={event.eventId}>
              {event.eventName} ·{" "}
              {new Date(event.startsAt).toLocaleDateString()}
            </option>
          ))}
        </select>
      </label>

      <label className="text-sm font-medium">
        Assignment role
        <input
          className={inputClass}
          maxLength={100}
          name="assignmentRole"
          placeholder="Small Group Leader"
          required
        />
      </label>

      <label className="text-sm font-medium">
        Assignment starts (optional)
        <input className={inputClass} name="startsAt" type="datetime-local" />
      </label>

      <label className="text-sm font-medium">
        Assignment ends (optional)
        <input className={inputClass} name="endsAt" type="datetime-local" />
      </label>

      <div className="space-y-3 md:col-span-2">
        <p className="text-xs text-slate-500">
          Select an existing Event and record this Volunteer&apos;s assignment.
        </p>

        <Message state={state} />

        <button
          className="min-h-11 rounded-lg bg-sky-700 px-4 py-2 text-sm font-semibold text-white disabled:bg-slate-400"
          disabled={pending || events.length === 0}
        >
          {pending
            ? "Scheduling…"
            : events.length === 0
              ? "No schedulable events"
              : "Schedule volunteer"}
        </button>
      </div>
    </form>
  );
}

function AssignmentResponse({
  assignment,
  canManage,
  profileId,
}: Readonly<{
  assignment: VolunteerAssignment;
  canManage: boolean;
  profileId: string;
}>) {
  const [state, action, pending] = useActionState(
    setAssignmentStatusAction,
    initialState,
  );

  return (
    <form action={action} className="mt-3 flex flex-wrap items-center gap-2">
      <input
        name="assignmentId"
        type="hidden"
        value={assignment.assignmentId}
      />
      <input name="profileId" type="hidden" value={profileId} />

      {canManage ? (
        <>
          <select
            className="min-h-11 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
            defaultValue={assignment.assignmentStatus}
            name="status"
          >
            <option value="assigned">Assigned</option>
            <option value="confirmed">Confirmed</option>
            <option value="declined">Declined</option>
            <option value="cancelled">Cancelled</option>
            <option value="completed">Completed</option>
          </select>

          <button
            className="min-h-11 rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white disabled:bg-slate-400"
            disabled={pending}
          >
            Update status
          </button>
        </>
      ) : (
        <>
          <button
            className="min-h-11 rounded-lg bg-emerald-700 px-3 py-2 text-sm font-semibold text-white disabled:bg-slate-400"
            disabled={pending}
            name="status"
            value="confirmed"
          >
            Confirm
          </button>

          <button
            className="min-h-11 rounded-lg border border-red-300 px-3 py-2 text-sm font-semibold text-red-800 disabled:text-slate-400"
            disabled={pending}
            name="status"
            value="declined"
          >
            Decline
          </button>
        </>
      )}

      <Message state={state} />
    </form>
  );
}

export function VolunteerAssignmentList({
  assignments,
  canManage,
  profileId,
}: Readonly<{
  assignments: VolunteerAssignment[];
  canManage: boolean;
  profileId: string;
}>) {
  if (assignments.length === 0) {
    return (
      <p className="text-sm text-slate-600">
        No volunteer assignments recorded.
      </p>
    );
  }

  return (
    <ul className="grid gap-3 md:grid-cols-2">
      {assignments.map((assignment) => (
        <li
          className="rounded-lg border border-slate-200 p-4"
          key={assignment.assignmentId}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="font-semibold text-slate-950">
                {assignment.eventName}
              </h3>

              <p className="mt-1 text-sm text-slate-600">
                {assignment.assignmentRole}
              </p>
            </div>

            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
              {assignment.assignmentStatus}
            </span>
          </div>

          <p className="mt-3 text-sm text-slate-700">
            {new Date(assignment.eventStartsAt).toLocaleString()} ·{" "}
            {assignment.eventTimezone}
          </p>

          {canManage ||
          ["assigned", "confirmed", "declined"].includes(
            assignment.assignmentStatus,
          ) ? (
            <AssignmentResponse
              assignment={assignment}
              canManage={canManage}
              profileId={profileId}
            />
          ) : null}
        </li>
      ))}
    </ul>
  );
}