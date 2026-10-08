"use client";

import { useActionState } from "react";

import {
  createManagedInvitationAction,
  revokeManagedInvitationAction,
} from "@/features/auth/actions/invitation-management-actions";
import { roleLabels } from "@/features/auth/types/authorization";

import type { AccountRole } from "@/lib/supabase/database.types";

const initialState = { success: false } as const;
const roles = Object.entries(roleLabels) as [AccountRole, string][];
const inputClassName =
  "mt-1 block min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 outline-none focus:border-sky-600 focus:ring-3 focus:ring-sky-100 aria-invalid:border-red-600 disabled:bg-slate-100 disabled:text-slate-600";

export function AdministrationInvitationForm({
  currentRole,
}: Readonly<{
  currentRole: AccountRole;
}>) {
  const [state, formAction, pending] = useActionState(
    createManagedInvitationAction,
    initialState,
  );
  const errors = state.success ? undefined : state.fieldErrors;

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="font-bold text-slate-950">Invite user</h2>
      <form action={formAction} className="mt-4" noValidate>
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(12rem,1fr)_10rem_auto] lg:items-end">
          <label className="block text-sm font-medium text-slate-800">
            Email
            <input
              aria-invalid={Boolean(errors?.email)}
              autoComplete="email"
              className={inputClassName}
              maxLength={320}
              name="email"
              required
              type="email"
            />
            {errors?.email?.[0] ? (
              <span className="mt-2 block text-sm text-red-700">
                {errors.email[0]}
              </span>
            ) : null}
          </label>

          <label className="block text-sm font-medium text-slate-800">
            Intended primary role
            <select
              aria-invalid={Boolean(errors?.intendedPrimaryRole)}
              className={inputClassName}
              defaultValue="parent"
              name="intendedPrimaryRole"
            >
              {roles
                .filter(
                  ([value]) =>
                    currentRole === "platform_administrator" ||
                    value !== "platform_administrator",
                )
                .map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
            </select>
          </label>

          <label className="block text-sm font-medium text-slate-800">
            Expires after
            <select
              aria-invalid={Boolean(errors?.expirationDays)}
              className={inputClassName}
              defaultValue="7"
              name="expirationDays"
            >
              <option value="7">7 days</option>
              <option value="14">14 days</option>
              <option value="30">30 days</option>
            </select>
          </label>

          <button
            className="min-h-11 rounded-lg bg-sky-700 px-5 py-2 text-sm font-semibold text-white hover:bg-sky-800 disabled:bg-slate-400"
            disabled={pending}
            type="submit"
          >
            {pending ? "Sending…" : "Send invitation"}
          </button>
        </div>

        {state.message ? (
          <p
            aria-live="polite"
            className={[
              "mt-4 rounded-lg border px-4 py-3 text-sm",
              state.success
                ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                : "border-red-200 bg-red-50 text-red-800",
            ].join(" ")}
            role="status"
          >
            {state.message}
          </p>
        ) : null}
      </form>
    </section>
  );
}

export function RevokeManagedInvitationButton({
  invitationId,
}: Readonly<{
  invitationId: string;
}>) {
  const [state, formAction, pending] = useActionState(
    revokeManagedInvitationAction,
    initialState,
  );

  return (
    <form
      action={formAction}
      onSubmit={(event) => {
        if (!window.confirm("Revoke this pending invitation?")) {
          event.preventDefault();
        }
      }}
    >
      <input name="invitationId" type="hidden" value={invitationId} />
      <button
        className="rounded-lg border border-red-300 px-3 py-1.5 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:text-red-400"
        disabled={pending}
        type="submit"
      >
        {pending ? "Revoking…" : "Revoke"}
      </button>
      {state.message ? (
        <p
          aria-live="polite"
          className={[
            "mt-2 text-sm",
            state.success ? "text-emerald-700" : "text-red-700",
          ].join(" ")}
          role="status"
        >
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
