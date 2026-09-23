"use client";

import { useActionState } from "react";
import { archiveCareNoteAction, createCareNoteAction, type PrayerCareActionState } from "@/features/prayer-care/actions/prayer-care-actions";

type Option = { id: string; name: string };
const initialState: PrayerCareActionState = { success: false };
const field = "mt-1 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 py-2";

export function CareNoteForm({ people, categories }: Readonly<{ people: Option[]; categories: Option[] }>) {
  const [state, action, pending] = useActionState(createCareNoteAction, initialState);
  return <form action={action} className="space-y-4">
    <p className="rounded-lg bg-red-50 p-3 text-sm text-red-950">Highly confidential. Use synthetic information only during development and never copy this content into messages.</p>
    <label className="block text-sm font-semibold">Person<select className={field} name="personId" required defaultValue=""><option disabled value="">Select a person</option>{people.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
    <label className="block text-sm font-semibold">Category<select className={field} name="categoryId" defaultValue=""><option value="">No category</option>{categories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
    <label className="block text-sm font-semibold">Title<input className={field} name="title" maxLength={200} required /></label>
    <label className="block text-sm font-semibold">Occurred at<input className={field} name="occurredAt" type="datetime-local" /></label>
    <label className="block text-sm font-semibold">Confidential note<textarea className={field} name="noteContent" rows={5} maxLength={10000} required /></label>
    {state.message ? <p className={state.success ? "text-emerald-700" : "text-red-700"}>{state.message}</p> : null}
    <button className="min-h-11 rounded-lg bg-red-800 px-5 font-semibold text-white" disabled={pending || !people.length}>{pending ? "Creating…" : "Create confidential note"}</button>
  </form>;
}

export function ArchiveCareNoteForm({ careNoteId }: Readonly<{ careNoteId: string }>) {
  const [state, action, pending] = useActionState(archiveCareNoteAction, initialState);
  return <details className="mt-4 border-t border-red-200 pt-3">
    <summary className="cursor-pointer font-semibold text-red-800">Manage care record</summary>
    <form action={action} className="mt-3">
    <input type="hidden" name="careNoteId" value={careNoteId} />
    <button className="min-h-11 rounded-lg border border-red-300 px-4 font-semibold text-red-800" disabled={pending}>
      {pending ? "Archiving…" : "Archive care note"}
    </button>
    {state.message ? <p className={state.success ? "mt-2 text-sm text-emerald-700" : "mt-2 text-sm text-red-700"}>{state.message}</p> : null}
    </form>
  </details>;
}
