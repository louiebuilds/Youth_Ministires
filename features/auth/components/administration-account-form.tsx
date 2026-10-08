"use client";

import { useActionState, useState } from "react";
import Link from "next/link";

import {
  sendManagedAccountPasswordResetAction,
  updateManagedAccountAction,
} from "@/features/auth/actions/account-management-actions";
import { roleLabels } from "@/features/auth/types/authorization";

import type { ManagedAccount } from "@/features/auth/types/account-management";
import type {
  AccountRole,
  AccountStatus,
} from "@/lib/supabase/database.types";

const initialState = { success: false } as const;
const roles = Object.entries(roleLabels) as [AccountRole, string][];
const statusDetails: Record<
  AccountStatus,
  { label: string; description: string; className: string }
> = {
  active: {
    label: "Active",
    description: "Can use platform features permitted by the account's access.",
    className: "bg-emerald-50 text-emerald-700",
  },
  archived: {
    label: "Archived",
    description: "Retained for records; protected platform access is unavailable.",
    className: "bg-slate-100 text-slate-600",
  },
  disabled: {
    label: "Disabled",
    description: "Platform access is disabled until the account is reactivated.",
    className: "bg-slate-100 text-slate-700",
  },
  invited: {
    label: "Invited",
    description: "Account setup is pending; protected platform access is unavailable.",
    className: "bg-sky-50 text-sky-700",
  },
  suspended: {
    label: "Suspended",
    description: "Temporarily blocked from protected platform access.",
    className: "bg-amber-50 text-amber-800",
  },
};
const statuses = Object.entries(statusDetails) as [
  AccountStatus,
  (typeof statusDetails)[AccountStatus],
][];
const allowedStatusTransitions: Record<AccountStatus, readonly AccountStatus[]> = {
  invited: ["invited", "active"],
  active: ["active", "suspended", "disabled", "archived"],
  suspended: ["suspended", "active", "disabled", "archived"],
  disabled: ["disabled", "active", "archived"],
  archived: ["archived"],
};
const inputClassName =
  "mt-1 block min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 outline-none focus:border-sky-600 focus:ring-3 focus:ring-sky-100 aria-invalid:border-red-600 disabled:bg-slate-100 disabled:text-slate-600";

export function AdministrationAccountForm({
  account,
  currentProfileId,
  currentRole,
}: Readonly<{
  account: ManagedAccount;
  currentProfileId: string;
  currentRole: AccountRole;
}>) {
  const [state, formAction, pending] = useActionState(
    updateManagedAccountAction,
    initialState,
  );
  const [resetState, resetFormAction, resetPending] = useActionState(
    sendManagedAccountPasswordResetAction,
    initialState,
  );
  const [editing, setEditing] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState(account.status);
  const isCurrentAccount = account.id === currentProfileId;
  const canEdit =
    currentRole === "platform_administrator" ||
    account.primaryRole !== "platform_administrator";
  const canSendPasswordReset =
    currentRole === "platform_administrator" ||
    account.primaryRole !== "platform_administrator";
  const availableStatuses = statuses.filter(([status]) =>
    allowedStatusTransitions[account.status].includes(status),
  );
  const errors = state.success ? undefined : state.fieldErrors;

  if (!editing) {
    return (
      <article className="px-4 py-4">
        <div className="grid gap-3 md:grid-cols-[minmax(0,1.25fr)_minmax(0,1.75fr)_minmax(9rem,1fr)_7rem_minmax(17rem,auto)] md:items-center md:gap-4">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500 md:hidden">
              Display name
            </p>
            <h2 className="truncate font-semibold text-slate-950">
              {account.displayName}
            </h2>
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500 md:hidden">
              Email
            </p>
            <p className="break-words text-sm text-slate-600">{account.email}</p>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500 md:hidden">
              Primary role
            </p>
            <p className="text-sm text-slate-800">
              {roleLabels[account.primaryRole]}
            </p>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500 md:hidden">
              Status
            </p>
            <span
              className={`inline-flex rounded px-2 py-0.5 text-xs font-semibold ${statusDetails[account.status].className}`}
              title={statusDetails[account.status].description}
            >
              {statusDetails[account.status].label}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2 md:justify-self-end">
            {canEdit ? (
              <button
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                onClick={() => {
                  setSelectedStatus(account.status);
                  setEditing(true);
                }}
                type="button"
              >
                Edit
              </button>
            ) : null}
            <Link
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              href={`/administration/accounts/${account.id}/access`}
            >
              Access
            </Link>
            {canSendPasswordReset ? (
              <form
                action={resetFormAction}
                onSubmit={(event) => {
                  if (
                    !window.confirm(
                      `Send a password reset email to ${account.email}?`,
                    )
                  ) {
                    event.preventDefault();
                  }
                }}
              >
                <input name="profileId" type="hidden" value={account.id} />
                <button
                  className="rounded-lg border border-sky-300 px-3 py-1.5 text-sm font-semibold text-sky-800 hover:bg-sky-50 disabled:text-slate-400"
                  disabled={resetPending}
                  type="submit"
                >
                  {resetPending ? "Sending…" : "Send password reset"}
                </button>
              </form>
            ) : null}
          </div>
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
        {resetState.message ? (
          <p
            aria-live="polite"
            className={[
              "mt-3 rounded-lg border px-3 py-2 text-sm",
              resetState.success && resetState.warning
                ? "border-amber-200 bg-amber-50 text-amber-900"
                : resetState.success
                  ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                  : "border-red-200 bg-red-50 text-red-800",
            ].join(" ")}
            role="status"
          >
            {resetState.message}
          </p>
        ) : null}
      </article>
    );
  }

  return (
    <form
      action={formAction}
      className="bg-sky-50/50 px-4 py-4"
      noValidate
    >
      <input name="profileId" type="hidden" value={account.id} />
      <div>
        <h2 className="font-semibold text-slate-950">Edit account</h2>
        <p className="mt-1 break-words text-sm text-slate-600">{account.email}</p>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
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
          Primary role
          <select
            aria-invalid={Boolean(errors?.primaryRole)}
            className={inputClassName}
            defaultValue={account.primaryRole}
            disabled={isCurrentAccount}
            name="primaryRole"
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
          {isCurrentAccount ? (
            <input name="primaryRole" type="hidden" value={account.primaryRole} />
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
            onChange={(event) =>
              setSelectedStatus(event.target.value as AccountStatus)
            }
          >
            {availableStatuses.map(([value, details]) => (
              <option key={value} value={value}>
                {details.label}
              </option>
            ))}
          </select>
          {isCurrentAccount ? (
            <input name="status" type="hidden" value={account.status} />
          ) : null}
          <span className="mt-2 block text-xs leading-5 text-slate-600">
            {statusDetails[selectedStatus].description}
          </span>
        </label>
      </div>

      {isCurrentAccount ? (
        <p className="mt-3 text-sm text-slate-600">
          Your own role and status cannot be changed from this account.
        </p>
      ) : null}

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

      <div className="mt-4 flex justify-end gap-2">
        <button
          className="min-h-11 rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:text-slate-400"
          disabled={pending}
          onClick={() => setEditing(false)}
          type="button"
        >
          Cancel
        </button>
        <button
          className="min-h-11 rounded-lg bg-sky-700 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-800 disabled:bg-slate-400"
          disabled={pending}
          type="submit"
        >
          {pending ? "Saving…" : "Save"}
        </button>
      </div>
    </form>
  );
}
