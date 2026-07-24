"use client";

import { useActionState } from "react";

import { updateManagedAccountAction } from "@/features/auth/actions/account-management-actions";
import { roleLabels } from "@/features/auth/types/authorization";

import type { ManagedAccount } from "@/features/auth/types/account-management";
import type {
  AccountRole,
  AccountStatus,
} from "@/lib/supabase/database.types";

const initialState = { success: false } as const;

const roles = Object.entries(roleLabels) as [AccountRole, string][];
const statuses: { value: AccountStatus; label: string }[] = [
  { value: "invited", label: "Invited" },
  { value: "active", label: "Active" },
  { value: "suspended", label: "Suspended" },
  { value: "disabled", label: "Disabled" },
  { value: "archived", label: "Archived" },
];

const inputClassName =
  "mt-2 block min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 outline-none transition focus:border-sky-600 focus:ring-3 focus:ring-sky-100 aria-invalid:border-red-600 disabled:bg-slate-100 disabled:text-slate-600";

export function ManagedAccountForm({
  account,
  currentProfileId,
}: Readonly<{
  account: ManagedAccount;
  currentProfileId: string;
}>) {
  const [state, formAction, pending] = useActionState(
    updateManagedAccountAction,
    initialState,
  );
  const isCurrentAccount = account.id === currentProfileId;
  const errors = state.success ? undefined : state.fieldErrors;

  return (
    <form
      action={formAction}
      className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
      noValidate
    >
      <input name="profileId" type="hidden" value={account.id} />
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold text-slate-950">{account.displayName}</h2>
          <p className="mt-1 text-sm text-slate-600">{account.email}</p>
        </div>
        {isCurrentAccount ? (
          <span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold text-sky-800">
            Your account
          </span>
        ) : null}
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-3">
        <label className="block text-sm font-medium text-slate-800">
          Display name
          <input
            aria-invalid={Boolean(errors?.displayName)}
            className={inputClassName}
            defaultValue={account.displayName}
            maxLength={150}
            name="displayName"
            required
          />
          {errors?.displayName?.[0] ? (
            <span className="mt-2 block text-sm text-red-700">
              {errors.displayName[0]}
            </span>
          ) : null}
        </label>

        <label className="block text-sm font-medium text-slate-800">
          Permanent role
          <select
            aria-invalid={Boolean(errors?.primaryRole)}
            className={inputClassName}
            defaultValue={account.primaryRole}
            disabled={isCurrentAccount}
            name="primaryRole"
          >
            {roles.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          {isCurrentAccount ? (
            <input
              name="primaryRole"
              type="hidden"
              value={account.primaryRole}
            />
          ) : null}
        </label>

        <label className="block text-sm font-medium text-slate-800">
          Account status
          <select
            aria-invalid={Boolean(errors?.status)}
            className={inputClassName}
            defaultValue={account.status}
            disabled={isCurrentAccount}
            name="status"
          >
            {statuses.map(({ value, label }) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          {isCurrentAccount ? (
            <input name="status" type="hidden" value={account.status} />
          ) : null}
        </label>
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

      <div className="mt-5 flex items-center justify-between gap-4">
        <p className="text-xs leading-5 text-slate-500">
          {isCurrentAccount
            ? "Your role and active status are protected."
            : "Role and status changes take effect on the account’s next authorization check."}
        </p>
        <button
          className="min-h-11 shrink-0 rounded-lg bg-sky-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-800 disabled:cursor-not-allowed disabled:bg-slate-400"
          disabled={pending}
          type="submit"
        >
          {pending ? "Saving…" : "Save account"}
        </button>
      </div>
    </form>
  );
}
