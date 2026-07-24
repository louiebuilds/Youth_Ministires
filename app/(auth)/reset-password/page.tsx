import type { Metadata } from "next";

import { ResetPasswordForm } from "@/features/auth/components/reset-password-form";

export const metadata: Metadata = {
  title: "Choose a new password",
};

export default function ResetPasswordPage() {
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

      <ResetPasswordForm />
    </div>
  );
}
