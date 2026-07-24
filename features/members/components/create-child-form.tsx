"use client";

import { useActionState } from "react";

import { createChildAction } from "@/features/members/actions/child-management-actions";

import type { FamilyAdult } from "@/features/members/types/family-workspace";

const initialState = { success: false } as const;
const inputClass =
  "mt-1 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 outline-none focus:border-sky-600 focus:ring-3 focus:ring-sky-100";

export function CreateChildForm({ householdId, adults }: Readonly<{ householdId: string; adults: FamilyAdult[] }>) {
  const [state, action, pending] = useActionState(createChildAction, initialState);
  const responsibleAdults = adults.filter((adult) => adult.isResponsibleAdult);
  return (
    <form action={action} className="space-y-5" noValidate>
      <input name="householdId" type="hidden" value={householdId} />
      <div className="grid gap-4 md:grid-cols-2">
        {[
          ["firstName", "First name"],
          ["preferredName", "Preferred name"],
          ["lastName", "Last name"],
          ["birthDate", "Birth date"],
          ["grade", "Grade"],
        ].map(([name, label]) => <label className="text-sm font-medium text-slate-800" key={name}>{label}<input className={inputClass} name={name} required={name !== "preferredName"} type={name === "birthDate" ? "date" : "text"} /></label>)}
        <label className="text-sm font-medium text-slate-800">Status<select className={inputClass} defaultValue="active" name="status"><option value="prospective">Prospective</option><option value="registered">Registered</option><option value="active">Active</option><option value="inactive">Inactive</option></select></label>
        <label className="text-sm font-medium text-slate-800 md:col-span-2">Initial legal guardian<select className={inputClass} name="guardianPersonId" required><option value="">Select responsible adult</option>{responsibleAdults.map((adult) => <option key={adult.id} value={adult.id}>{adult.preferredName || adult.firstName} {adult.lastName}</option>)}</select></label>
      </div>
      {[
        ["medicalSummary", "Medical summary", 4000],
        ["allergySummary", "Allergy summary", 4000],
        ["dietarySummary", "Dietary summary", 2000],
      ].map(([name, label, maximum]) => <label className="block text-sm font-medium text-slate-800" key={String(name)}>{String(label)}<textarea className={inputClass} maxLength={Number(maximum)} name={String(name)} rows={3} /></label>)}
      {responsibleAdults.length === 0 ? <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">Add a responsible adult before creating a child.</p> : null}
      {state.message ? <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{state.message}</p> : null}
      <button className="min-h-11 rounded-lg bg-sky-700 px-5 py-2 text-sm font-semibold text-white disabled:bg-slate-400" disabled={pending || responsibleAdults.length === 0}>{pending ? "Creating…" : "Create child"}</button>
    </form>
  );
}
