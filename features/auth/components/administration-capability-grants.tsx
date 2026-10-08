"use client";

import { useActionState } from "react";

import {
  grantManagedCapabilityAction,
  revokeManagedCapabilityAction,
} from "@/features/auth/actions/account-management-actions";

import type { ManagedCapabilityActionState } from "@/features/auth/types/account-management";
import type { PlatformCapability } from "@/features/auth/types/authorization";

const initialState: ManagedCapabilityActionState = { success: false };
const inputClass = "mt-1 min-h-10 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm";

export function CapabilityGrantForm({
  capabilities,
  profileId,
}: Readonly<{
  capabilities: readonly PlatformCapability[];
  profileId: string;
}>) {
  const [state, action, pending] = useActionState(
    grantManagedCapabilityAction,
    initialState,
  );

  return (
    <form action={action} className="mt-4 grid gap-3 rounded-lg bg-slate-50 p-3 lg:grid-cols-[minmax(12rem,1fr)_minmax(14rem,1.5fr)_minmax(12rem,1fr)_auto]">
      <input name="profileId" type="hidden" value={profileId} />
      <label className="text-sm font-semibold text-slate-700">
        Capability
        <select className={inputClass} name="capability" required>
          <option value="">Select capability</option>
          {capabilities.map((capability) => (
            <option key={capability} value={capability}>{capability}</option>
          ))}
        </select>
        {state.fieldErrors?.capability?.[0] ? <span className="mt-1 block text-xs text-red-700">{state.fieldErrors.capability[0]}</span> : null}
      </label>
      <label className="text-sm font-semibold text-slate-700">
        Reason
        <input className={inputClass} maxLength={1000} name="reason" required />
        {state.fieldErrors?.reason?.[0] ? <span className="mt-1 block text-xs text-red-700">{state.fieldErrors.reason[0]}</span> : null}
      </label>
      <label className="text-sm font-semibold text-slate-700">
        Expires (optional)
        <input className={inputClass} name="expiresAt" type="datetime-local" />
        {state.fieldErrors?.expiresAt?.[0] ? <span className="mt-1 block text-xs text-red-700">{state.fieldErrors.expiresAt[0]}</span> : null}
      </label>
      <div className="self-end">
        <button className="min-h-10 rounded-lg bg-sky-700 px-4 text-sm font-semibold text-white disabled:opacity-60" disabled={pending}>
          {pending ? "Granting…" : "Grant capability"}
        </button>
      </div>
      {state.message ? <p className={`text-sm font-semibold lg:col-span-4 ${state.success ? "text-emerald-700" : "text-red-700"}`} role="status">{state.message}</p> : null}
    </form>
  );
}

export function CapabilityRevokeForm({
  grantId,
  profileId,
}: Readonly<{ grantId: string; profileId: string }>) {
  const [state, action, pending] = useActionState(
    revokeManagedCapabilityAction,
    initialState,
  );

  return (
    <form
      action={action}
      className="mt-2 space-y-2"
      onSubmit={(event) => {
        if (!window.confirm("Revoke this capability grant?")) event.preventDefault();
      }}
    >
      <input name="grantId" type="hidden" value={grantId} />
      <input name="profileId" type="hidden" value={profileId} />
      <input aria-label="Revocation reason" className="min-h-9 w-full rounded border border-slate-300 px-2 text-xs" maxLength={1000} minLength={5} name="reason" placeholder="Revocation reason" required />
      <button className="min-h-9 rounded border border-red-300 px-3 text-xs font-semibold text-red-700 disabled:opacity-60" disabled={pending}>
        {pending ? "Revoking…" : "Revoke"}
      </button>
      {state.message ? <p className={`text-xs font-semibold ${state.success ? "text-emerald-700" : "text-red-700"}`} role="status">{state.message}</p> : null}
    </form>
  );
}
