import type { Metadata } from "next";

import { ForgotPasswordForm } from "@/features/auth/components/forgot-password-form";

export const metadata: Metadata = {
  title: "Forgot password",
};

export default function ForgotPasswordPage() {
  return (
    <div>
      <div className="mb-8">
        <p className="text-sm font-semibold text-sky-700">Account recovery</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
          Reset your password
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          Enter your account email address and we will send recovery
          instructions if the account is eligible.
        </p>
      </div>

      <ForgotPasswordForm />
    </div>
  );
}
