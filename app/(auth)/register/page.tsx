import type { Metadata } from "next";

import { RegisterForm } from "@/features/auth/components/register-form";

export const metadata: Metadata = {
  title: "Register",
};

export default function RegisterPage() {
  return (
    <div>
      <div className="mb-8">
        <p className="text-sm font-semibold text-sky-700">Create an account</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
          Register for the platform
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          Account registration does not grant a ministry role. Access is
          assigned separately after approval.
        </p>
      </div>

      <RegisterForm />
    </div>
  );
}
