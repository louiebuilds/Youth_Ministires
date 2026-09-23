"use client";

import { useActionState, useState } from "react";
import { answerPrayerRequestAction, archivePrayerRequestAction, updatePrayerRequestAction, type PrayerCareActionState } from "@/features/prayer-care/actions/prayer-care-actions";
import { normalizePrayerVisibility, prayerVisibilityOptions } from "@/features/prayer-care/components/prayer-visibility.mjs";
import type { VisiblePrayerRequest } from "@/features/prayer-care/types/prayer-care";

const initialState: PrayerCareActionState = { success: false };
const field = "mt-1 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 py-2";
type Option = { id: string; name: string };

export function PrayerLifecycleForms({ request, people, categories }: Readonly<{ request: VisiblePrayerRequest; people: Option[]; categories: Option[] }>) {
  const { prayerRequestId, status } = request;
  const [answerState, answerAction, answering] = useActionState(answerPrayerRequestAction, initialState);
  const [archiveState, archiveAction, archiving] = useActionState(archivePrayerRequestAction, initialState);
  const [editState, editAction, editing] = useActionState(updatePrayerRequestAction, initialState);
  const [showEdit, setShowEdit] = useState(false);
  const [visibility, setVisibility] = useState(request.visibility);
  return <details className="mt-5 border-t border-slate-200 pt-4">
    <summary className="cursor-pointer font-semibold text-sky-800">Manage request</summary>
    <div className="mt-4 space-y-4">
    {status === "active" && !showEdit ? <button className="min-h-11 rounded-lg border border-sky-300 px-4 font-semibold text-sky-800" onClick={() => setShowEdit(true)} type="button">Edit request</button> : null}
    {status === "active" && showEdit ? <form action={editAction} className="space-y-4 rounded-lg border border-sky-200 bg-sky-50/50 p-4">
      <input name="prayerRequestId" type="hidden" value={prayerRequestId} />
      <label className="block text-sm font-semibold">Person<select className={field} defaultValue={request.personId} name="personId" required>
        {people.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
      </select></label>
      <label className="block text-sm font-semibold">Category<select className={field} defaultValue={request.categoryId ?? ""} name="categoryId">
        <option value="">General / no category</option>{categories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
      </select></label>
      <label className="block text-sm font-semibold">Visibility<select className={field} name="visibility" value={visibility} onChange={(event) => setVisibility(normalizePrayerVisibility(event.currentTarget.value))}>
        {prayerVisibilityOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select></label>
      <label className="block text-sm font-semibold">Title<input className={field} defaultValue={request.title} maxLength={200} name="title" required /></label>
      <label className="block text-sm font-semibold">Request details<textarea className={field} defaultValue={request.requestDetails} maxLength={10000} name="requestDetails" required rows={5} /></label>
      {editState.message ? <p className={editState.success ? "text-emerald-700" : "text-red-700"}>{editState.message}</p> : null}
      <div className="flex flex-wrap gap-2"><button className="min-h-11 rounded-lg bg-sky-700 px-4 font-semibold text-white" disabled={editing}>{editing ? "Saving…" : "Save changes"}</button><button className="min-h-11 rounded-lg border border-slate-300 bg-white px-4 font-semibold text-slate-700" onClick={() => { setShowEdit(false); setVisibility(request.visibility); }} type="button">Cancel</button></div>
    </form> : null}
    {status === "active" ? <form action={answerAction} className="space-y-3">
      <input name="prayerRequestId" type="hidden" value={prayerRequestId} />
      <label className="block text-sm font-semibold">Answered-prayer summary
        <textarea className="mt-1 min-h-24 w-full rounded-lg border border-slate-300 px-3 py-2" maxLength={5000} name="answerSummary" required />
      </label>
      <button className="min-h-11 rounded-lg bg-emerald-700 px-4 font-semibold text-white" disabled={answering}>{answering ? "Saving…" : "Mark answered"}</button>
    </form> : null}
    {status === "answered" ? <form action={archiveAction}>
      <input name="prayerRequestId" type="hidden" value={prayerRequestId} />
      <button className="min-h-11 rounded-lg border border-slate-400 px-4 font-semibold text-slate-800" disabled={archiving}>{archiving ? "Archiving…" : "Archive answered request"}</button>
    </form> : null}
    {[answerState.message, archiveState.message].filter(Boolean).map((message) => <p className="text-sm" key={message}>{message}</p>)}
    </div>
  </details>;
}
