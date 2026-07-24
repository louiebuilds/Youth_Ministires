"use client";

import { useActionState } from "react";

import { createFamilyAction } from "@/features/members/actions/family-management-actions";

const initialState = { success: false } as const;
const inputClass =
  "mt-1 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 outline-none focus:border-sky-600 focus:ring-3 focus:ring-sky-100";

export function CreateFamilyForm() {
  const [state, action, pending] = useActionState(createFamilyAction, initialState);
  return (
    <form action={action} className="space-y-6" noValidate>
      <fieldset className="space-y-4">
        <legend className="text-lg font-semibold text-slate-950">Family details</legend>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="text-sm font-medium text-slate-800">Family name<input className={inputClass} name="name" required /></label>
          <label className="text-sm font-medium text-slate-800">Status<select className={inputClass} defaultValue="active" name="status"><option value="prospect">Prospect</option><option value="active">Active</option><option value="inactive">Inactive</option></select></label>
          {[
            ["addressLine1", "Address line 1"],
            ["addressLine2", "Address line 2"],
            ["city", "City"],
            ["region", "State or region"],
            ["postalCode", "Postal code"],
          ].map(([name, label]) => <label className="text-sm font-medium text-slate-800" key={name}>{label}<input className={inputClass} name={name} /></label>)}
          <label className="text-sm font-medium text-slate-800">Country code<input className={inputClass} defaultValue="US" maxLength={2} name="countryCode" required /></label>
        </div>
      </fieldset>
      <fieldset className="space-y-4">
        <legend className="text-lg font-semibold text-slate-950">Responsible adult</legend>
        <p className="text-sm text-slate-600">This adult becomes the family’s primary contact. Provide an email address or phone number.</p>
        <div className="grid gap-4 md:grid-cols-2">
          {[
            ["adultFirstName", "First name"],
            ["adultPreferredName", "Preferred name"],
            ["adultLastName", "Last name"],
            ["relationshipLabel", "Relationship"],
            ["adultEmail", "Email"],
            ["adultPhone", "Phone"],
          ].map(([name, label]) => <label className="text-sm font-medium text-slate-800" key={name}>{label}<input className={inputClass} name={name} required={name === "adultFirstName" || name === "adultLastName" || name === "relationshipLabel"} type={name === "adultEmail" ? "email" : "text"} /></label>)}
        </div>
        <div className="grid gap-2 text-sm text-slate-700 sm:grid-cols-3">
          <label className="flex items-center gap-2"><input defaultChecked name="receiveEmail" type="checkbox" />Receive email</label>
          <label className="flex items-center gap-2"><input defaultChecked name="receiveSms" type="checkbox" />Receive text messages</label>
          <label className="flex items-center gap-2"><input defaultChecked name="receiveEmergencyNotifications" type="checkbox" />Emergency alerts</label>
        </div>
      </fieldset>
      {state.message ? <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{state.message}</p> : null}
      <button className="min-h-11 rounded-lg bg-sky-700 px-5 py-2 text-sm font-semibold text-white disabled:bg-slate-400" disabled={pending}>{pending ? "Creating…" : "Create family"}</button>
    </form>
  );
}
