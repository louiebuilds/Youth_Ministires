import type { Metadata } from "next";
import Image from "next/image";

import { LoginForm } from "@/features/auth/components/login-form";

export const metadata: Metadata = {
  title: "Sign in",
};

export default function LoginPage() {
  return (
    <div>
      <div className="mb-8">
        <Image
          alt="Youth Ministries logo"
          className="mx-auto mb-8 h-auto w-full max-w-sm"
          height={314}
          priority
          src="/images/youth-ministries-logo.png"
          width={1220}
        />
        <p className="text-sm font-semibold text-sky-700">Welcome back</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
          Sign in to your account
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          Use the email address connected to your ministry account.
        </p>
      </div>

      <LoginForm />
    </div>
  );
}
