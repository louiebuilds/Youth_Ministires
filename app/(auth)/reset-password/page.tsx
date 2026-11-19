import type { Metadata } from "next";

import { ResetPasswordForm } from "@/features/auth/components/reset-password-form";

export const metadata: Metadata = {
  title: "Choose a new password",
};

export default async function ResetPasswordPage({
  searchParams,
}: Readonly<{
  searchParams: Promise<{ error?: string | string[] }>;
}>) {
  const invalidLink = (await searchParams).error === "invalid";
  return (
    <div>
      <div className="mb-8">
        <p className="text-sm font-semibold text-sky-700">Account recovery</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
          Choose a new password
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          Your recovery session will be verified before the password is
          changed.
        </p>
      </div>

      {invalidLink ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-4 text-sm leading-6 text-amber-950">
          This recovery link is invalid, expired, or has already been used. Request
          a new recovery email to continue.
        </div>
      ) : (
        <ResetPasswordForm />
      )}
      {invalidLink ? (
        <a
          className="mt-6 flex min-h-11 w-full items-center justify-center rounded-lg bg-sky-700 px-4 py-2.5 text-sm font-semibold text-white"
          href="/forgot-password"
        >
          Request a new link
        </a>
      ) : null}
    </div>
  );
}
