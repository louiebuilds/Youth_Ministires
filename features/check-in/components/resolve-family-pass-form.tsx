"use client";

import { useActionState } from "react";

import { resolveFamilyTokenAction } from "@/features/check-in/actions/check-in-actions";

import type { CheckInActionState } from "@/features/check-in/types/check-in";

const initialState: CheckInActionState = { success: false };
const inputClass =
  "min-h-11 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-base outline-none focus:border-sky-600 focus:ring-3 focus:ring-sky-100";

export function ResolveFamilyPassForm({
  eventId,
}: Readonly<{ eventId: string }>) {
  const [state, action, pending] = useActionState(
    resolveFamilyTokenAction,
    initialState,
  );
  return (
    <form action={action} className="mt-3 space-y-3">
      <input name="eventId" type="hidden" value={eventId} />
      <label className="block text-sm font-semibold text-slate-700" htmlFor="token">
        Scan or paste pass value
      </label>
      <input autoComplete="off" className={inputClass} id="token"
        minLength={70} name="token" required />
      {state.message ? (
        <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-800"
          role="alert">
          {state.message}
        </p>
      ) : null}
      <button className="min-h-11 rounded-lg bg-sky-700 px-4 font-semibold text-white disabled:opacity-60"
        disabled={pending}>
        {pending ? "Opening family…" : "Open family"}
      </button>
    </form>
  );
}
