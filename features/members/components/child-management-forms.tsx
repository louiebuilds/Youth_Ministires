"use client";

import { useActionState } from "react";

import {
  updateChildDetailsAction,
  updateChildRelationshipAction,
} from "@/features/members/actions/child-management-actions";

import type {
  ChildRelationship,
  ChildWorkspace,
} from "@/features/members/types/child-workspace";

const initialState = { success: false } as const;
const inputClass =
  "mt-1 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 outline-none focus:border-sky-600 focus:ring-3 focus:ring-sky-100";

function Message({ state }: Readonly<{ state: { success: boolean; message?: string } }>) {
  return state.message ? (
    <p className={`rounded-lg border px-3 py-2 text-sm ${state.success ? "border-emerald-200 bg-emerald-50 text-emerald-900" : "border-red-200 bg-red-50 text-red-800"}`}>
      {state.message}
    </p>
  ) : null;
}

export function ChildDetailsForm({ child }: Readonly<{ child: ChildWorkspace }>) {
  const [state, action, pending] = useActionState(updateChildDetailsAction, initialState);
  return (
    <form action={action} className="space-y-4">
      <input name="studentId" type="hidden" value={child.id} />
      <div className="grid gap-4 md:grid-cols-2">
        {[
          ["firstName", "First name", child.firstName],
          ["preferredName", "Preferred name", child.preferredName],
          ["lastName", "Last name", child.lastName],
          ["birthDate", "Birth date", child.birthDate],
          ["grade", "Grade", child.grade],
        ].map(([name, label, value]) => (
          <label className="text-sm font-medium text-slate-800" key={String(name)}>
            {label}
            <input className={inputClass} defaultValue={value ?? ""} name={String(name)} type={name === "birthDate" ? "date" : "text"} />
          </label>
        ))}
        <label className="text-sm font-medium text-slate-800">
          Status
          <select className={inputClass} defaultValue={child.status} name="status">
            <option value="prospective">Prospective</option>
            <option value="registered">Registered</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="archived">Archived</option>
          </select>
        </label>
      </div>
      {[
        ["medicalSummary", "Medical summary", child.medicalSummary, 4000],
        ["allergySummary", "Allergy summary", child.allergySummary, 4000],
        ["dietarySummary", "Dietary summary", child.dietarySummary, 2000],
      ].map(([name, label, value, maximum]) => (
        <label className="block text-sm font-medium text-slate-800" key={String(name)}>
          {String(label)}
          <textarea className={inputClass} defaultValue={String(value ?? "")} maxLength={Number(maximum)} name={String(name)} rows={3} />
        </label>
      ))}
      <Message state={state} />
      <button className="min-h-11 rounded-lg bg-sky-700 px-4 py-2 text-sm font-semibold text-white disabled:bg-slate-400" disabled={pending}>
        {pending ? "Saving…" : "Save child"}
      </button>
    </form>
  );
}

export function ChildRelationshipForm({ relationship, studentId }: Readonly<{ relationship: ChildRelationship; studentId: string }>) {
  const [state, action, pending] = useActionState(updateChildRelationshipAction, initialState);
  const options: [string, string, boolean][] = [
    ["isLegalGuardian", "Legal guardian", relationship.isLegalGuardian],
    ["isEmergencyContact", "Emergency contact", relationship.isEmergencyContact],
    ["isAuthorizedPickup", "Authorized pickup", relationship.isAuthorizedPickup],
    ["maySignPermissionForms", "May sign permission forms", relationship.maySignPermissionForms],
    ["mayViewStudentInformation", "May view child information", relationship.mayViewStudentInformation],
    ["receiveEmail", "Receive email", relationship.receiveEmail],
    ["receiveSms", "Receive text messages", relationship.receiveSms],
  ];
  return (
    <form action={action} className="space-y-4 rounded-lg border border-slate-200 p-4">
      <input name="studentId" type="hidden" value={studentId} />
      <input name="personId" type="hidden" value={relationship.personId} />
      <h3 className="font-semibold text-slate-950">{relationship.displayName}</h3>
      <label className="block text-sm font-medium text-slate-800">
        Relationship
        <input className={inputClass} defaultValue={relationship.relationshipType} name="relationshipType" />
      </label>
      <div className="grid gap-2 text-sm text-slate-700 sm:grid-cols-2">
        {options.map(([name, label, value]) => (
          <label className="flex items-center gap-2" key={name}>
            <input defaultChecked={value} name={name} type="checkbox" />
            {label}
          </label>
        ))}
      </div>
      <Message state={state} />
      <button className="min-h-11 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:bg-slate-400" disabled={pending}>
        {pending ? "Saving…" : "Save permissions"}
      </button>
    </form>
  );
}
