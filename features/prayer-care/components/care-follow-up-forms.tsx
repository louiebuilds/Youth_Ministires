"use client";

import { useActionState } from "react";
import { cancelCareFollowUpAction, completeCareFollowUpAction, createCareFollowUpAction, type PrayerCareActionState } from "@/features/prayer-care/actions/prayer-care-actions";
import type { CareFollowUp } from "@/features/prayer-care/types/prayer-care";

type Option = { id: string; name: string };
const initial: PrayerCareActionState = { success: false };
const field = "mt-1 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 py-2";

export function CareFollowUpForm({ people, assignees }: Readonly<{ people: Option[]; assignees: Option[] }>) {
  const [state, action, pending] = useActionState(createCareFollowUpAction, initial);
  return <form action={action} className="grid gap-4 md:grid-cols-2">
    <label className="text-sm font-semibold">Person<select className={field} name="personId" required defaultValue=""><option disabled value="">Select person</option>{people.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select></label>
    <label className="text-sm font-semibold">Assigned caregiver<select className={field} name="assignedToProfileId" required defaultValue=""><option disabled value="">Select caregiver</option>{assignees.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select></label>
    <label className="text-sm font-semibold md:col-span-2">Title<input className={field} name="title" maxLength={200} required /></label>
    <label className="text-sm font-semibold">Priority<select className={field} name="priority" defaultValue="normal"><option value="low">Low</option><option value="normal">Normal</option><option value="high">High</option><option value="urgent">Urgent</option></select></label>
    <label className="text-sm font-semibold">Due at<input className={field} name="dueAt" type="datetime-local" /></label>
    <label className="text-sm font-semibold md:col-span-2">Instructions<textarea className={field} name="instructions" rows={3} maxLength={5000} /></label>
    {state.message ? <p className={state.success ? "text-emerald-700 md:col-span-2" : "text-red-700 md:col-span-2"}>{state.message}</p> : null}
    <button className="min-h-11 rounded-lg bg-sky-700 px-5 font-semibold text-white md:col-span-2" disabled={pending}>{pending ? "Creating…" : "Create follow-up"}</button>
  </form>;
}

export function CareFollowUpLifecycle({ followUp }: Readonly<{ followUp: CareFollowUp }>) {
  const [completeState, completeAction, completing] = useActionState(completeCareFollowUpAction, initial);
  const [cancelState, cancelAction, cancelling] = useActionState(cancelCareFollowUpAction, initial);
  if (!(["pending", "in_progress"] as const).includes(followUp.status as "pending" | "in_progress")) return null;
  return <div className="mt-4 grid gap-3 border-t border-slate-200 pt-4 md:grid-cols-2">
    <form action={completeAction} className="space-y-2"><input type="hidden" name="careFollowUpId" value={followUp.careFollowUpId} /><textarea className={field} name="completionNotes" placeholder="Completion notes (optional)" maxLength={5000} /><button className="min-h-11 rounded-lg bg-emerald-700 px-4 font-semibold text-white" disabled={completing}>Complete</button></form>
    <form action={cancelAction} className="space-y-2"><input type="hidden" name="careFollowUpId" value={followUp.careFollowUpId} /><textarea className={field} name="cancellationReason" placeholder="Required cancellation reason" required maxLength={1000} /><button className="min-h-11 rounded-lg border border-red-300 px-4 font-semibold text-red-800" disabled={cancelling}>Cancel</button></form>
    {[completeState.message, cancelState.message].filter(Boolean).map((message) => <p className="text-sm md:col-span-2" key={message}>{message}</p>)}
  </div>;
}
