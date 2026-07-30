"use client";

import { useActionState } from "react";

import {
  createEventChecklistItemAction,
  createEventReminderAction,
  setEventChecklistItemCompletedAction,
  setEventReminderStatusAction,
} from "@/features/events/actions/event-management-actions";

import type {
  EventActionState,
  EventChecklistItem,
  EventReminder,
} from "@/features/events/types/event-management";

const initialState: EventActionState = { success: false };
const inputClass =
  "mt-1 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm";

function Message({ state }: Readonly<{ state: EventActionState }>) {
  return state.message ? (
    <p className={`text-sm font-semibold ${
      state.success ? "text-emerald-700" : "text-red-700"
    }`}>{state.message}</p>
  ) : null;
}

function ReminderRow({
  eventId,
  reminder,
}: Readonly<{ eventId: string; reminder: EventReminder }>) {
  const [state, action, pending] = useActionState(
    setEventReminderStatusAction,
    initialState,
  );
  return (
    <li className="rounded-lg border border-slate-200 p-4">
      <div className="flex flex-wrap justify-between gap-3">
        <div>
          <h3 className="font-semibold">{reminder.title}</h3>
          <p className="text-sm text-slate-600">
            {new Date(reminder.remindAt).toLocaleString()}
          </p>
          {reminder.notes ? <p className="mt-1 text-sm">{reminder.notes}</p> : null}
        </div>
        <span className="text-sm font-semibold">{reminder.reminderStatus}</span>
      </div>
      <form action={action} className="mt-3 flex flex-wrap gap-2">
        <input name="eventId" type="hidden" value={eventId} />
        <input name="reminderId" type="hidden" value={reminder.reminderId} />
        <button className="min-h-11 rounded-lg bg-slate-900 px-3 text-sm font-semibold text-white"
          disabled={pending} name="status" value="completed">Complete</button>
        <button className="min-h-11 rounded-lg border border-slate-300 px-3 text-sm font-semibold"
          disabled={pending} name="status" value="cancelled">Cancel</button>
      </form>
      <Message state={state} />
    </li>
  );
}

function ChecklistRow({
  eventId,
  item,
}: Readonly<{ eventId: string; item: EventChecklistItem }>) {
  const [state, action, pending] = useActionState(
    setEventChecklistItemCompletedAction,
    initialState,
  );
  return (
    <li className="rounded-lg border border-slate-200 p-4">
      <h3 className={`font-semibold ${item.isCompleted ? "line-through" : ""}`}>
        {item.title}
      </h3>
      {item.notes ? <p className="mt-1 text-sm">{item.notes}</p> : null}
      {item.dueAt ? (
        <p className="mt-1 text-sm text-slate-600">
          Due {new Date(item.dueAt).toLocaleString()}
        </p>
      ) : null}
      <form action={action} className="mt-3">
        <input name="eventId" type="hidden" value={eventId} />
        <input name="checklistItemId" type="hidden" value={item.checklistItemId} />
        <button className="min-h-11 rounded-lg bg-slate-900 px-3 text-sm font-semibold text-white"
          disabled={pending} name="isCompleted"
          value={item.isCompleted ? "false" : "true"}>
          {item.isCompleted ? "Reopen" : "Complete"}
        </button>
      </form>
      <Message state={state} />
    </li>
  );
}

export function EventPlanningTools({
  checklistItems,
  eventId,
  reminders,
}: Readonly<{
  checklistItems: EventChecklistItem[];
  eventId: string;
  reminders: EventReminder[];
}>) {
  const [reminderState, reminderAction, reminderPending] = useActionState(
    createEventReminderAction,
    initialState,
  );
  const [checklistState, checklistAction, checklistPending] = useActionState(
    createEventChecklistItemAction,
    initialState,
  );
  return (
    <section className="grid gap-6 lg:grid-cols-2">
      <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-xl font-bold">In-app reminders</h2>
        <form action={reminderAction} className="space-y-3">
          <input name="eventId" type="hidden" value={eventId} />
          <label className="block text-sm font-semibold">Title
            <input className={inputClass} maxLength={200} name="title" required />
          </label>
          <label className="block text-sm font-semibold">Reminder time
            <input className={inputClass} name="remindAt"
              required type="datetime-local" />
          </label>
          <label className="block text-sm font-semibold">Notes
            <textarea className={inputClass} maxLength={1000}
              name="notes" rows={2} />
          </label>
          <button className="min-h-11 rounded-lg bg-sky-700 px-4 font-semibold text-white"
            disabled={reminderPending}>Create reminder</button>
          <Message state={reminderState} />
        </form>
        <ul className="space-y-3">
          {reminders.map((reminder) => (
            <ReminderRow eventId={eventId} key={reminder.reminderId}
              reminder={reminder} />
          ))}
        </ul>
      </div>
      <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-xl font-bold">Event checklist</h2>
        <form action={checklistAction} className="space-y-3">
          <input name="eventId" type="hidden" value={eventId} />
          <label className="block text-sm font-semibold">Item
            <input className={inputClass} maxLength={200} name="title" required />
          </label>
          <label className="block text-sm font-semibold">Due time (optional)
            <input className={inputClass} name="dueAt" type="datetime-local" />
          </label>
          <label className="block text-sm font-semibold">Notes
            <textarea className={inputClass} maxLength={1000}
              name="notes" rows={2} />
          </label>
          <button className="min-h-11 rounded-lg bg-sky-700 px-4 font-semibold text-white"
            disabled={checklistPending}>Add checklist item</button>
          <Message state={checklistState} />
        </form>
        <ul className="space-y-3">
          {checklistItems.map((item) => (
            <ChecklistRow eventId={eventId} item={item}
              key={item.checklistItemId} />
          ))}
        </ul>
      </div>
    </section>
  );
}
