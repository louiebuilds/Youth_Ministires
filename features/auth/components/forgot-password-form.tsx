"use client";

import Link from "next/link";
import { useActionState } from "react";

import { requestPasswordResetAction } from "@/features/auth/actions/password-recovery-actions";

import type { PasswordResetRequestState } from "@/features/auth/types/password-recovery";

const initialState: PasswordResetRequestState = {
  success: false,
};

export function ForgotPasswordForm() {
  const [state, formAction, pending] = useActionState(
    requestPasswordResetAction,
    initialState,
  );
  const emailError =
    state.success === false ? state.fieldErrors?.email?.[0] : undefined;

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
          className="mt-6 flex min-h-11 w-full items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 transition hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700"
          href="/login"
        >
          Return to sign in
        </Link>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-5" noValidate>
      <div>
        <label
          className="block text-sm font-medium text-slate-800"
          htmlFor="recovery-email"
        >
          Email address
        </label>
        <input
          aria-describedby={emailError ? "recovery-email-error" : undefined}
          aria-invalid={Boolean(emailError)}
          autoComplete="email"
          className="mt-2 block min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-base text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-sky-600 focus:ring-3 focus:ring-sky-100 aria-invalid:border-red-600 aria-invalid:focus:border-red-600 aria-invalid:focus:ring-red-100"
          id="recovery-email"
          inputMode="email"
          name="email"
          placeholder="you@example.com"
          required
          type="email"
        />
        {emailError ? (
          <p
            className="mt-2 text-sm text-red-700"
            id="recovery-email-error"
          >
            {emailError}
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
        {pending ? "Sending instructions…" : "Send recovery instructions"}
      </button>

      <p className="text-center text-sm text-slate-600">
        Remembered your password?{" "}
        <Link
          className="font-semibold text-sky-700 underline-offset-4 hover:underline focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700"
          href="/login"
        >
          Sign in
        </Link>
      </p>
    </form>
  );
}
