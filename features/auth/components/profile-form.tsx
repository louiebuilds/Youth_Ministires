"use client";

import { useActionState } from "react";

import { updateProfileAction } from "@/features/auth/actions/profile-actions";

import type { ProfileActionState } from "@/features/auth/types/profile";

const initialState: ProfileActionState = {
  success: false,
};

type ProfileFormProps = Readonly<{
  displayName: string;
  email: string;
  roleLabel: string;
}>;

const inputClassName =
  "mt-2 block min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-base text-slate-950 outline-none transition focus:border-sky-600 focus:ring-3 focus:ring-sky-100 aria-invalid:border-red-600 aria-invalid:focus:border-red-600 aria-invalid:focus:ring-red-100 disabled:bg-slate-100 disabled:text-slate-600";

export function ProfileForm({
  displayName,
  email,
  roleLabel,
}: ProfileFormProps) {
  const [state, formAction, pending] = useActionState(
    updateProfileAction,
    initialState,
  );
  const displayNameError = state.success
    ? undefined
    : state.fieldErrors?.displayName?.[0];

  return (
    <form action={formAction} className="space-y-5" noValidate>
      <div>
        <label
          className="block text-sm font-medium text-slate-800"
          htmlFor="profile-display-name"
        >
          Display name
        </label>
        <input
          aria-describedby={
            displayNameError ? "profile-display-name-error" : undefined
          }
          aria-invalid={Boolean(displayNameError)}
          autoComplete="name"
          className={inputClassName}
          defaultValue={displayName}
          id="profile-display-name"
          maxLength={150}
          name="displayName"
          required
          type="text"
        />
        {displayNameError ? (
          <p
            className="mt-2 text-sm text-red-700"
            id="profile-display-name-error"
          >
            {displayNameError}
          </p>
        ) : null}
      </div>

      <div>
        <label
          className="block text-sm font-medium text-slate-800"
          htmlFor="profile-email"
        >
          Email address
        </label>
        <input
          className={inputClassName}
          disabled
          id="profile-email"
          type="email"
          value={email}
        />
        <p className="mt-2 text-xs leading-5 text-slate-500">
          Email changes require an administrator-assisted identity workflow.
        </p>
      </div>

      <div>
        <label
          className="block text-sm font-medium text-slate-800"
          htmlFor="profile-role"
        >
          Permanent role
        </label>
        <input
          className={inputClassName}
          disabled
          id="profile-role"
          type="text"
          value={roleLabel}
        />
      </div>

      {state.message ? (
        <div
          aria-live="polite"
          className={[
            "rounded-lg border px-4 py-3 text-sm leading-6",
            state.success
              ? "border-emerald-200 bg-emerald-50 text-emerald-900"
              : "border-red-200 bg-red-50 text-red-800",
          ].join(" ")}
          role="status"
        >
          {state.message}
        </div>
      ) : null}

      <button
        className="flex min-h-11 items-center justify-center rounded-lg bg-sky-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700 disabled:cursor-not-allowed disabled:bg-slate-400"
        disabled={pending}
        type="submit"
      >
        {pending ? "Saving profile…" : "Save profile"}
      </button>
    </form>
  );
}
