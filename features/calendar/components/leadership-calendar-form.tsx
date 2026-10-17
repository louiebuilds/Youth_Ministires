"use client";

import { useActionState } from "react";

import {
  deleteLeadershipCalendarEntryAction,
  saveLeadershipCalendarEntryAction,
} from "@/features/calendar/actions/leadership-calendar-actions";
import type { CalendarItem } from "@/features/calendar/types/platform-calendar";

function localInputValue(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

export function LeadershipCalendarForm({ entry }: Readonly<{ entry?: CalendarItem }>) {
  const [saveState, saveAction, saving] = useActionState(saveLeadershipCalendarEntryAction, { success: false });
  const [deleteState, deleteAction, deleting] = useActionState(deleteLeadershipCalendarEntryAction, { success: false });
  return (
    <section className="rounded-xl border border-purple-200 bg-purple-50 p-4">
      <div className="mb-4">
        <p className="text-sm font-semibold text-purple-700">Leadership only</p>
        <h2 className="text-xl font-bold">{entry ? "Edit private entry" : "Add private entry"}</h2>
        <p className="mt-1 text-sm text-slate-600">Visible to the Youth Director and Platform Administrator. Only the Youth Director can make changes.</p>
      </div>
      <form action={saveAction} className="grid gap-4 md:grid-cols-2">
        {entry ? <input name="entryId" type="hidden" value={entry.itemId} /> : null}
        <input name="timezone" type="hidden" value="America/Chicago" />
        <label className="md:col-span-2 text-sm font-semibold">Title
          <input className="mt-1 min-h-11 w-full rounded-lg border bg-white px-3" defaultValue={entry?.title} maxLength={200} name="title" required />
        </label>
        <label className="text-sm font-semibold">Starts
          <input className="mt-1 min-h-11 w-full rounded-lg border bg-white px-3" defaultValue={localInputValue(entry?.startsAt)} name="startsAt" required type="datetime-local" />
        </label>
        <label className="text-sm font-semibold">Ends
          <input className="mt-1 min-h-11 w-full rounded-lg border bg-white px-3" defaultValue={localInputValue(entry?.endsAt)} name="endsAt" required type="datetime-local" />
        </label>
        <label className="md:col-span-2 text-sm font-semibold">Details (optional)
          <textarea className="mt-1 min-h-24 w-full rounded-lg border bg-white p-3" defaultValue={entry?.context ?? ""} maxLength={2000} name="details" />
        </label>
        <div className="md:col-span-2 flex flex-wrap items-center gap-3">
          <button className="min-h-11 rounded-lg bg-purple-700 px-4 py-2 font-semibold text-white disabled:opacity-60" disabled={saving} type="submit">{saving ? "Saving…" : entry ? "Save changes" : "Add to calendar"}</button>
          {saveState.message ? <p aria-live="polite" className="text-sm font-medium">{saveState.message}</p> : null}
        </div>
      </form>
      {entry ? (
        <form action={deleteAction} className="mt-4 border-t border-purple-200 pt-4">
          <input name="entryId" type="hidden" value={entry.itemId} />
          <button className="min-h-11 rounded-lg border border-red-300 bg-white px-4 py-2 font-semibold text-red-700 disabled:opacity-60" disabled={deleting} type="submit">{deleting ? "Deleting…" : "Delete entry"}</button>
          {deleteState.message ? <span aria-live="polite" className="ml-3 text-sm font-medium">{deleteState.message}</span> : null}
        </form>
      ) : null}
    </section>
  );
}
