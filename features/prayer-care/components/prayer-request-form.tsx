"use client";

import { useActionState } from "react";
import { createPrayerRequestAction, type PrayerCareActionState } from "@/features/prayer-care/actions/prayer-care-actions";

type Option = { id: string; name: string };
const initialState: PrayerCareActionState = { success: false };
const field = "mt-1 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 py-2";

export function PrayerRequestForm({ people, categories }: Readonly<{ people: Option[]; categories: Option[] }>) {
  const [state, action, pending] = useActionState(createPrayerRequestAction, initialState);
  return <form action={action} className="space-y-4">
    <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-950">Use synthetic information only during development and testing.</p>
    <label className="block text-sm font-semibold">Person<select className={field} name="personId" required defaultValue="">
      <option disabled value="">Select a person</option>{people.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
    </select></label>
    <label className="block text-sm font-semibold">Category<select className={field} name="categoryId" defaultValue="">
      <option value="">General / no category</option>{categories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
    </select></label>
    <label className="block text-sm font-semibold">Visibility<select className={field} name="visibility" defaultValue="leadership">
      <option value="public">Public signed-in summary</option><option value="leadership">Ministry leadership</option><option value="private">Private oversight</option>
    </select></label>
    <label className="block text-sm font-semibold">Title<input className={field} name="title" maxLength={200} required /></label>
    <label className="block text-sm font-semibold">Request details<textarea className={field} name="requestDetails" maxLength={10000} rows={5} required /></label>
    {state.message ? <p className={state.success ? "text-emerald-700" : "text-red-700"}>{state.message}</p> : null}
    <button className="min-h-11 rounded-lg bg-sky-700 px-5 font-semibold text-white" disabled={pending || !people.length}>{pending ? "Creating…" : "Create prayer request"}</button>
  </form>;
}
