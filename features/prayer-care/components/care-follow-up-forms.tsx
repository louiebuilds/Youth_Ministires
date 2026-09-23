"use client";

import { useActionState, useState } from "react";

import {
  cancelCareFollowUpAction,
  completeCareFollowUpAction,
  createCareFollowUpAction,
  updateCareFollowUpAction,
  type PrayerCareActionState,
} from "@/features/prayer-care/actions/prayer-care-actions";
import type { CareFollowUp } from "@/features/prayer-care/types/prayer-care";

type Option = { id: string; name: string };

const initial: PrayerCareActionState = { success: false };

const field =
  "mt-1 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 py-2";

function toLocalDateTimeInput(value: string | null) {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Chicago",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });

  const parts = Object.fromEntries(
    formatter
      .formatToParts(date)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );

  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}

export function CareFollowUpForm({
  people,
  assignees,
  careNoteId = null,
  lockedPerson = null,
}: Readonly<{
  people: Option[];
  assignees: Option[];
  careNoteId?: string | null;
  lockedPerson?: Option | null;
}>) {
  const [state, action, pending] = useActionState(
    createCareFollowUpAction,
    initial,
  );

  return (
    <form action={action} className="grid gap-4 md:grid-cols-2">
      {careNoteId ? (
        <input type="hidden" name="careNoteId" value={careNoteId} />
      ) : null}

      {lockedPerson ? (
        <div className="text-sm font-semibold">
          Person
          <div className={`${field} text-slate-700`}>
            {lockedPerson.name}
          </div>
          <input type="hidden" name="personId" value={lockedPerson.id} />
          <p className="mt-1 text-xs font-normal text-slate-500">
            Person is inherited from the linked care record and cannot be
            changed.
          </p>
        </div>
      ) : (
        <label className="text-sm font-semibold">
          Person
          <select
            className={field}
            name="personId"
            required
            defaultValue=""
          >
            <option disabled value="">
              Select person
            </option>

            {people.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
      )}

      <label className="text-sm font-semibold">
        Assigned caregiver
        <select
          className={field}
          name="assignedToProfileId"
          required
          defaultValue=""
        >
          <option disabled value="">
            Select caregiver
          </option>

          {assignees.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
      </label>

      <label className="text-sm font-semibold md:col-span-2">
        Title
        <input
          className={field}
          name="title"
          maxLength={200}
          required
        />
      </label>

      <label className="text-sm font-semibold">
        Priority
        <select
          className={field}
          name="priority"
          defaultValue="normal"
        >
          <option value="low">Low</option>
          <option value="normal">Normal</option>
          <option value="high">High</option>
          <option value="urgent">Urgent</option>
        </select>
      </label>

      <label className="text-sm font-semibold">
        Due at
        <input
          className={field}
          name="dueAt"
          type="datetime-local"
        />
      </label>

      <label className="text-sm font-semibold md:col-span-2">
        Instructions
        <textarea
          className={field}
          name="instructions"
          rows={3}
          maxLength={5000}
        />
      </label>

      {state.message ? (
        <p
          className={
            state.success
              ? "text-emerald-700 md:col-span-2"
              : "text-red-700 md:col-span-2"
          }
        >
          {state.message}
        </p>
      ) : null}

      <button
        className="min-h-11 rounded-lg bg-sky-700 px-5 font-semibold text-white md:col-span-2"
        disabled={pending || !assignees.length}
      >
        {pending ? "Creating…" : "Create follow-up"}
      </button>
    </form>
  );
}

export function EditCareFollowUpForm({
  followUp,
  people,
  assignees,
}: Readonly<{
  followUp: CareFollowUp;
  people: Option[];
  assignees: Option[];
}>) {
  const [state, action, pending] = useActionState(
    updateCareFollowUpAction,
    initial,
  );

  const [priority, setPriority] = useState<CareFollowUp["priority"]>(
    followUp.priority,
  );

  const [status, setStatus] = useState<"pending" | "in_progress">(
    followUp.status === "in_progress" ? "in_progress" : "pending",
  );

  const linked =
    Boolean(followUp.careNoteId) || Boolean(followUp.prayerRequestId);

  return (
    <form action={action} className="grid gap-4 md:grid-cols-2">
      <input
        type="hidden"
        name="careFollowUpId"
        value={followUp.careFollowUpId}
      />

      {linked ? (
        <div className="text-sm font-semibold">
          Person
          <div className={`${field} text-slate-700`}>
            {followUp.personName}
          </div>

          <input
            type="hidden"
            name="personId"
            value={followUp.personId}
          />

          <p className="mt-1 text-xs font-normal text-slate-500">
            Person is locked because this follow-up is linked to an existing
            source record.
          </p>
        </div>
      ) : (
        <label className="text-sm font-semibold">
          Person
          <select
            className={field}
            name="personId"
            required
            defaultValue={followUp.personId}
          >
            {people.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
      )}

      <label className="text-sm font-semibold">
        Assigned caregiver
        <select
          className={field}
          name="assignedToProfileId"
          required
          defaultValue={followUp.assignedToProfileId}
        >
          {assignees.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
      </label>

      <label className="text-sm font-semibold md:col-span-2">
        Title
        <input
          className={field}
          name="title"
          defaultValue={followUp.title}
          maxLength={200}
          required
        />
      </label>

      <label className="text-sm font-semibold">
        Priority
        <select
          className={field}
          name="priority"
          value={priority}
          onChange={(event) =>
            setPriority(event.target.value as CareFollowUp["priority"])
          }
        >
          <option value="low">Low</option>
          <option value="normal">Normal</option>
          <option value="high">High</option>
          <option value="urgent">Urgent</option>
        </select>
      </label>

      <label className="text-sm font-semibold">
        Status
        <select
          className={field}
          name="status"
          value={status}
          onChange={(event) =>
            setStatus(event.target.value as "pending" | "in_progress")
          }
        >
          <option value="pending">Pending</option>
          <option value="in_progress">In progress</option>
        </select>
      </label>

      <label className="text-sm font-semibold md:col-span-2">
        Due at
        <input
          className={field}
          name="dueAt"
          type="datetime-local"
          defaultValue={toLocalDateTimeInput(followUp.dueAt)}
        />
      </label>

      <label className="text-sm font-semibold md:col-span-2">
        Instructions
        <textarea
          className={field}
          name="instructions"
          rows={3}
          maxLength={5000}
          defaultValue={followUp.instructions ?? ""}
        />
      </label>

      {followUp.careNoteId ? (
        <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-700 md:col-span-2">
          Linked care record:{" "}
          <span className="font-semibold">
            {followUp.careNoteTitle ?? "Care record"}
          </span>
        </p>
      ) : null}

      {followUp.prayerRequestId ? (
        <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-700 md:col-span-2">
          Linked prayer request:{" "}
          <span className="font-semibold">
            {followUp.prayerRequestTitle ?? "Prayer request"}
          </span>
        </p>
      ) : null}

      {state.message ? (
        <p
          className={
            state.success
              ? "text-emerald-700 md:col-span-2"
              : "text-red-700 md:col-span-2"
          }
        >
          {state.message}
        </p>
      ) : null}

      <button
        className="min-h-11 rounded-lg bg-sky-700 px-5 font-semibold text-white md:col-span-2"
        disabled={pending || !assignees.length}
      >
        {pending ? "Saving…" : "Save follow-up changes"}
      </button>
    </form>
  );
}

export function CareFollowUpLifecycle({
  followUp,
}: Readonly<{
  followUp: CareFollowUp;
}>) {
  const [completeState, completeAction, completing] = useActionState(
    completeCareFollowUpAction,
    initial,
  );

  const [cancelState, cancelAction, cancelling] = useActionState(
    cancelCareFollowUpAction,
    initial,
  );

  if (
    !(["pending", "in_progress"] as const).includes(
      followUp.status as "pending" | "in_progress",
    )
  ) {
    return null;
  }

  return (
    <details className="mt-4 border-t border-slate-200 pt-4">
      <summary className="cursor-pointer font-semibold text-sky-800">
        Manage follow-up
      </summary>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <form action={completeAction} className="space-y-2">
          <input
            type="hidden"
            name="careFollowUpId"
            value={followUp.careFollowUpId}
          />

          <textarea
            className={field}
            name="completionNotes"
            placeholder="Completion notes (optional)"
            maxLength={5000}
          />

          <button
            className="min-h-11 rounded-lg bg-emerald-700 px-4 font-semibold text-white"
            disabled={completing}
          >
            {completing ? "Completing…" : "Complete"}
          </button>
        </form>

        <form action={cancelAction} className="space-y-2">
          <input
            type="hidden"
            name="careFollowUpId"
            value={followUp.careFollowUpId}
          />

          <textarea
            className={field}
            name="cancellationReason"
            placeholder="Required cancellation reason"
            required
            maxLength={1000}
          />

          <button
            className="min-h-11 rounded-lg border border-red-300 px-4 font-semibold text-red-800"
            disabled={cancelling}
          >
            {cancelling ? "Cancelling…" : "Cancel"}
          </button>
        </form>

        {[completeState.message, cancelState.message]
          .filter(Boolean)
          .map((message) => (
            <p className="text-sm md:col-span-2" key={message}>
              {message}
            </p>
          ))}
      </div>
    </details>
  );
}