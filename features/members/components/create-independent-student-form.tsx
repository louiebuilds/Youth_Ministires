"use client";

import { useActionState } from "react";

import { createIndependentStudentAction } from "@/features/members/actions/child-management-actions";

const initialState = { success: false } as const;
const inputClass =
  "mt-1 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-base text-slate-950 outline-none focus:border-sky-600 focus:ring-3 focus:ring-sky-100";

export function CreateIndependentStudentForm() {
  const [state, action, pending] = useActionState(
    createIndependentStudentAction,
    initialState,
  );

  return (
    <form action={action} className="space-y-5" noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-medium text-slate-800">
          First name
          <input className={inputClass} maxLength={100} name="firstName" required />
        </label>
        <label className="text-sm font-medium text-slate-800">
          Preferred name
          <input className={inputClass} maxLength={100} name="preferredName" />
        </label>
        <label className="text-sm font-medium text-slate-800">
          Last name
          <input className={inputClass} maxLength={100} name="lastName" required />
        </label>
        <label className="text-sm font-medium text-slate-800">
          Birth date
          <input className={inputClass} name="birthDate" required type="date" />
        </label>
        <label className="text-sm font-medium text-slate-800">
          Ministry group / grade
          <select className={inputClass} defaultValue="" name="grade" required>
            <option disabled value="">Select grade</option>
            <optgroup label="Middle School">
              <option value="6">Grade 6</option><option value="7">Grade 7</option><option value="8">Grade 8</option>
            </optgroup>
            <optgroup label="High School">
              <option value="9">Grade 9</option><option value="10">Grade 10</option><option value="11">Grade 11</option><option value="12">Grade 12</option>
            </optgroup>
          </select>
        </label>
        <label className="text-sm font-medium text-slate-800">
          Student status
          <select className={inputClass} defaultValue="prospective" name="status">
            <option value="prospective">Prospective</option>
            <option value="registered">Registered</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </label>
      </div>
      <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm leading-6 text-amber-950">
        This creates only a student record. It does not create a login, guardian
        authorization, emergency contact, consent, or permission status.
      </p>
      {state.message ? <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{state.message}</p> : null}
      <button className="min-h-11 rounded-lg bg-sky-700 px-5 py-2 font-semibold text-white disabled:bg-slate-400" disabled={pending}>
        {pending ? "Creating…" : "Add student"}
      </button>
    </form>
  );
}
