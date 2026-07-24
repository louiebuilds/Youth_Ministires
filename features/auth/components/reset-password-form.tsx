"use client";

import Link from "next/link";
import { useActionState } from "react";

import { updatePasswordAction } from "@/features/auth/actions/password-recovery-actions";

import type { UpdatePasswordState } from "@/features/auth/types/password-recovery";

const initialState: UpdatePasswordState = {
  success: false,
};

const inputClassName =
  "mt-2 block min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-base text-slate-950 outline-none transition focus:border-sky-600 focus:ring-3 focus:ring-sky-100 aria-invalid:border-red-600 aria-invalid:focus:border-red-600 aria-invalid:focus:ring-red-100";

export function ResetPasswordForm() {
  const [state, formAction, pending] = useActionState(
    updatePasswordAction,
    initialState,
  );

  if (state.success) {
    return (
      <div>
        <div
          aria-live="polite"
          className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm leading-6 text-emerald-900"
          role="status"
        >
          {state.message}
        </div>
        <Link
          className="mt-6 flex min-h-11 w-full items-center justify-center rounded-lg bg-sky-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700"
          href="/login"
        >
          Sign in
        </Link>
      </div>
    );
  }

  const passwordError = state.fieldErrors?.password?.[0];
  const confirmPasswordError = state.fieldErrors?.confirmPassword?.[0];

  return (
    <form action={formAction} className="space-y-5" noValidate>
      <div>
        <label
          className="block text-sm font-medium text-slate-800"
          htmlFor="new-password"
        >
          New password
        </label>
        <input
          aria-describedby={
            passwordError
              ? "new-password-help new-password-error"
              : "new-password-help"
          }
          aria-invalid={Boolean(passwordError)}
          autoComplete="new-password"
          className={inputClassName}
          id="new-password"
          name="password"
          required
          type="password"
        />
        <p
          className="mt-2 text-xs leading-5 text-slate-500"
          id="new-password-help"
        >
          Use at least 8 characters.
        </p>
        {passwordError ? (
          <p className="mt-2 text-sm text-red-700" id="new-password-error">
            {passwordError}
          </p>
        ) : null}
      </div>

      <div>
        <label
          className="block text-sm font-medium text-slate-800"
          htmlFor="confirm-new-password"
        >
          Confirm new password
        </label>
        <input
          aria-describedby={
            confirmPasswordError
              ? "confirm-new-password-error"
              : undefined
          }
          aria-invalid={Boolean(confirmPasswordError)}
          autoComplete="new-password"
          className={inputClassName}
          id="confirm-new-password"
          name="confirmPassword"
          required
          type="password"
        />
        {confirmPasswordError ? (
          <p
            className="mt-2 text-sm text-red-700"
            id="confirm-new-password-error"
          >
            {confirmPasswordError}
          </p>
        ) : null}
      </div>

      {state.message ? (
        <div
          aria-live="polite"
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-800"
          role="status"
        >
          {state.message}
        </div>
      ) : null}

      <button
        className="flex min-h-11 w-full items-center justify-center rounded-lg bg-sky-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700 disabled:cursor-not-allowed disabled:bg-slate-400"
        disabled={pending}
        type="submit"
      >
        {pending ? "Updating password…" : "Update password"}
      </button>

      <p className="text-center text-sm text-slate-600">
        Need another recovery email?{" "}
        <Link
          className="font-semibold text-sky-700 underline-offset-4 hover:underline focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700"
          href="/forgot-password"
        >
          Request a new link
        </Link>
      </p>
    </form>
  );
}
