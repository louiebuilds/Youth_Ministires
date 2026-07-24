"use client";

import { useActionState } from "react";

import {
  addFamilyAdultAction,
  updateFamilyAdultAction,
  updateFamilyDetailsAction,
} from "@/features/members/actions/family-management-actions";

import type { FamilyAdult, FamilyWorkspace } from "@/features/members/types/family-workspace";

const initialState = { success: false } as const;
const inputClass =
  "mt-1 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 outline-none focus:border-sky-600 focus:ring-3 focus:ring-sky-100";

function ResultMessage({
  state,
}: Readonly<{ state: { success: boolean; message?: string } }>) {
  return state.message ? (
    <p
      className={`rounded-lg border px-3 py-2 text-sm ${
        state.success
          ? "border-emerald-200 bg-emerald-50 text-emerald-900"
          : "border-red-200 bg-red-50 text-red-800"
      }`}
    >
      {state.message}
    </p>
  ) : null;
}

export function FamilyDetailsForm({
  family,
}: Readonly<{ family: FamilyWorkspace }>) {
  const [state, action, pending] = useActionState(
    updateFamilyDetailsAction,
    initialState,
  );
  return (
    <form action={action} className="space-y-4">
      <input name="householdId" type="hidden" value={family.id} />
      <div className="grid gap-4 md:grid-cols-2">
        <label className="text-sm font-medium text-slate-800">
          Family name
          <input className={inputClass} defaultValue={family.name} name="name" required />
        </label>
        <label className="text-sm font-medium text-slate-800">
          Status
          <select className={inputClass} defaultValue={family.status} name="status">
            <option value="prospect">Prospect</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="archived">Archived</option>
          </select>
        </label>
        {[
          ["addressLine1", "Address line 1", family.addressLine1],
          ["addressLine2", "Address line 2", family.addressLine2],
          ["city", "City", family.city],
          ["region", "State or region", family.region],
          ["postalCode", "Postal code", family.postalCode],
          ["countryCode", "Country code", family.countryCode],
        ].map(([name, label, value]) => (
          <label className="text-sm font-medium text-slate-800" key={String(name)}>
            {label}
            <input className={inputClass} defaultValue={value ?? ""} name={String(name)} />
          </label>
        ))}
      </div>
      <ResultMessage state={state} />
      <button className="min-h-11 rounded-lg bg-sky-700 px-4 py-2 text-sm font-semibold text-white disabled:bg-slate-400" disabled={pending}>
        {pending ? "Saving…" : "Save family"}
      </button>
    </form>
  );
}

export function FamilyAdultForm({
  adult,
  householdId,
}: Readonly<{ adult: FamilyAdult; householdId: string }>) {
  const [state, action, pending] = useActionState(
    updateFamilyAdultAction,
    initialState,
  );
  return (
    <form action={action} className="space-y-4 rounded-lg border border-slate-200 p-4">
      <input name="householdId" type="hidden" value={householdId} />
      <input name="personId" type="hidden" value={adult.id} />
      <div className="grid gap-3 md:grid-cols-2">
        {[
          ["firstName", "First name", adult.firstName],
          ["preferredName", "Preferred name", adult.preferredName],
          ["lastName", "Last name", adult.lastName],
          ["relationshipLabel", "Relationship", adult.relationshipLabel],
          ["email", "Email", adult.email],
          ["phone", "Phone", adult.phone],
        ].map(([name, label, value]) => (
          <label className="text-sm font-medium text-slate-800" key={String(name)}>
            {label}
            <input className={inputClass} defaultValue={value ?? ""} name={String(name)} />
          </label>
        ))}
      </div>
      <div className="grid gap-2 text-sm text-slate-700 sm:grid-cols-2">
        {[
          ["isResponsibleAdult", "Responsible adult", adult.isResponsibleAdult],
          ["isPrimaryContact", "Primary contact", adult.isPrimaryContact],
          ["receiveEmail", "Receive email", adult.receiveEmail],
          ["receiveSms", "Receive text messages", adult.receiveSms],
          ["receiveEmergencyNotifications", "Receive emergency alerts", adult.receiveEmergencyNotifications],
        ].map(([name, label, value]) => (
          <label className="flex items-center gap-2" key={String(name)}>
            <input defaultChecked={Boolean(value)} name={String(name)} type="checkbox" />
            {String(label)}
          </label>
        ))}
      </div>
      <ResultMessage state={state} />
      <button className="min-h-11 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:bg-slate-400" disabled={pending}>
        {pending ? "Saving…" : "Save contact"}
      </button>
    </form>
  );
}

export function AddFamilyAdultForm({
  householdId,
}: Readonly<{ householdId: string }>) {
  const [state, action, pending] = useActionState(
    addFamilyAdultAction,
    initialState,
  );
  return (
    <form
      action={action}
      className="space-y-4 rounded-lg border border-dashed border-sky-300 bg-white p-4"
    >
      <input name="householdId" type="hidden" value={householdId} />
      <h3 className="font-semibold text-slate-950">Add adult contact</h3>
      <p className="text-sm text-slate-600">
        Provide an email address or phone number. Selecting primary contact
        replaces the current primary contact.
      </p>
      <div className="grid gap-3 md:grid-cols-2">
        {[
          ["firstName", "First name"],
          ["preferredName", "Preferred name"],
          ["lastName", "Last name"],
          ["relationshipLabel", "Relationship"],
          ["email", "Email"],
          ["phone", "Phone"],
        ].map(([name, label]) => (
          <label className="text-sm font-medium text-slate-800" key={name}>
            {label}
            <input
              className={inputClass}
              name={name}
              required={
                name === "firstName" ||
                name === "lastName" ||
                name === "relationshipLabel"
              }
              type={name === "email" ? "email" : "text"}
            />
          </label>
        ))}
      </div>
      <div className="grid gap-2 text-sm text-slate-700 sm:grid-cols-2">
        {[
          ["isResponsibleAdult", "Responsible adult"],
          ["isPrimaryContact", "Primary contact"],
          ["receiveEmail", "Receive email"],
          ["receiveSms", "Receive text messages"],
          ["receiveEmergencyNotifications", "Receive emergency alerts"],
        ].map(([name, label]) => (
          <label className="flex items-center gap-2" key={name}>
            <input name={name} type="checkbox" />
            {label}
          </label>
        ))}
      </div>
      <ResultMessage state={state} />
      <button
        className="min-h-11 rounded-lg bg-sky-700 px-4 py-2 text-sm font-semibold text-white disabled:bg-slate-400"
        disabled={pending}
      >
        {pending ? "Adding…" : "Add adult"}
      </button>
    </form>
  );
}
