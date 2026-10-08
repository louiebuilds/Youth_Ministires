"use client";

import { useActionState } from "react";

import { updateMinistrySettingsAction } from "@/features/administration/actions/ministry-settings-actions";

import type {
  MinistrySettings,
  MinistrySettingsActionState,
} from "@/features/administration/types/ministry-settings";

const initialState: MinistrySettingsActionState = { success: false };
const inputClass = "mt-1 min-h-10 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm";

function FieldError({ errors }: Readonly<{ errors?: string[] }>) {
  return errors?.[0] ? <span className="mt-1 block text-xs text-red-700">{errors[0]}</span> : null;
}

export function MinistrySettingsForm({ settings }: Readonly<{ settings: MinistrySettings }>) {
  const [state, action, pending] = useActionState(
    updateMinistrySettingsAction,
    initialState,
  );

  return (
    <form action={action} className="space-y-5">
      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="font-bold text-slate-950">Ministry identity</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <label className="text-sm font-semibold text-slate-700">Ministry display name
            <input className={inputClass} defaultValue={settings.ministryDisplayName} maxLength={150} name="ministryDisplayName" required />
            <FieldError errors={state.fieldErrors?.ministryDisplayName} />
          </label>
          <label className="text-sm font-semibold text-slate-700">Timezone
            <select className={inputClass} defaultValue={settings.timezone} name="timezone">
              <option value="America/Chicago">America/Chicago</option>
            </select>
            <FieldError errors={state.fieldErrors?.timezone} />
          </label>
          <label className="text-sm font-semibold text-slate-700">Contact email
            <input className={inputClass} defaultValue={settings.contactEmail ?? ""} maxLength={320} name="contactEmail" type="email" />
            <FieldError errors={state.fieldErrors?.contactEmail} />
          </label>
          <label className="text-sm font-semibold text-slate-700">Contact phone
            <input className={inputClass} defaultValue={settings.contactPhone ?? ""} maxLength={50} name="contactPhone" />
            <FieldError errors={state.fieldErrors?.contactPhone} />
          </label>
          <label className="text-sm font-semibold text-slate-700">Default campus
            <input className={inputClass} defaultValue={settings.defaultCampusName ?? ""} maxLength={150} name="defaultCampusName" />
            <FieldError errors={state.fieldErrors?.defaultCampusName} />
          </label>
          <label className="text-sm font-semibold text-slate-700">Default event address
            <input className={inputClass} defaultValue={settings.defaultEventAddress ?? ""} maxLength={300} name="defaultEventAddress" />
            <FieldError errors={state.fieldErrors?.defaultEventAddress} />
          </label>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="font-bold text-slate-950">Operational defaults</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <label className="text-sm font-semibold text-slate-700 md:col-span-2">Family check-in instructions
            <textarea className={inputClass} defaultValue={settings.familyCheckinInstructions} maxLength={1000} name="familyCheckinInstructions" required rows={3} />
            <span className="mt-1 block text-xs font-normal text-slate-500">Must state that the QR identifies the household and does not authorize pickup or release.</span>
            <FieldError errors={state.fieldErrors?.familyCheckinInstructions} />
          </label>
          <label className="text-sm font-semibold text-slate-700">Default communication channel
            <select className={inputClass} defaultValue={settings.defaultCommunicationChannel} name="defaultCommunicationChannel">
              <option value="in_app">In-app</option>
              <option value="email">Email</option>
              <option value="sms">SMS</option>
            </select>
            <FieldError errors={state.fieldErrors?.defaultCommunicationChannel} />
          </label>
        </div>
      </section>

      <div className="flex flex-wrap items-center gap-3">
        <button className="min-h-11 rounded-lg bg-sky-700 px-5 font-semibold text-white disabled:opacity-60" disabled={pending}>
          {pending ? "Saving…" : "Save Ministry Settings"}
        </button>
        {state.message ? <p className={`text-sm font-semibold ${state.success ? "text-emerald-700" : "text-red-700"}`} role="status">{state.message}</p> : null}
      </div>
    </form>
  );
}
