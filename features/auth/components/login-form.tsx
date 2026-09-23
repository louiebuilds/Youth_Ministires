"use client";

import Link from "next/link";
import { useActionState, useEffect } from "react";

import { loginAction } from "@/features/auth/actions/login-action";

import type { LoginActionState } from "@/features/auth/types/login";

const initialState: LoginActionState = {
  success: false,
};

export function LoginForm() {
  const [state, formAction, pending] = useActionState(
    loginAction,
    initialState,
  );
  const emailError = state.success ? undefined : state.fieldErrors?.email?.[0];
  const passwordError = state.success
    ? undefined
    : state.fieldErrors?.password?.[0];

  useEffect(() => {
    if (state.success) window.location.replace("/");
  }, [state.success]);

  return (
    <form action={formAction} className="space-y-5" noValidate>
      <div>
        <label
          className="block text-sm font-medium text-slate-800"
          htmlFor="email"
        >
          Email address
        </label>
        <input
          aria-describedby={emailError ? "email-error" : undefined}
          aria-invalid={Boolean(emailError)}
          autoComplete="email"
          className="mt-2 block min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-base text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-sky-600 focus:ring-3 focus:ring-sky-100 aria-invalid:border-red-600 aria-invalid:focus:border-red-600 aria-invalid:focus:ring-red-100"
          id="email"
          inputMode="email"
          name="email"
          placeholder="you@example.com"
          required
          type="email"
        />
        {emailError ? (
          <p className="mt-2 text-sm text-red-700" id="email-error">
            {emailError}
          </p>
        ) : null}
      </div>

      <div>
        <div className="flex items-center justify-between gap-4">
          <label
            className="block text-sm font-medium text-slate-800"
            htmlFor="password"
          >
            Password
          </label>
          <Link
            className="text-sm font-medium text-sky-700 underline-offset-4 hover:underline focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700"
            href="/forgot-password"
          >
            Forgot password?
          </Link>
        </div>
        <input
          aria-describedby={passwordError ? "password-error" : undefined}
          aria-invalid={Boolean(passwordError)}
          autoComplete="current-password"
          className="mt-2 block min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-base text-slate-950 outline-none transition focus:border-sky-600 focus:ring-3 focus:ring-sky-100 aria-invalid:border-red-600 aria-invalid:focus:border-red-600 aria-invalid:focus:ring-red-100"
          id="password"
          name="password"
          required
          type="password"
        />
        {passwordError ? (
          <p className="mt-2 text-sm text-red-700" id="password-error">
            {passwordError}
          </p>
        ) : null}
      </div>

      {!state.success && state.message ? (
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
        {pending ? "Signing in…" : "Sign in"}
      </button>

      <p className="text-center text-sm text-slate-600">
        Need an account?{" "}
        <Link
          className="font-semibold text-sky-700 underline-offset-4 hover:underline focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700"
          href="/register"
        >
          Register
        </Link>
      </p>
    </form>
  );
}
