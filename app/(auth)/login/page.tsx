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
        <p className="mb-4 text-center text-xl font-bold tracking-tight text-slate-950">
          FUMC Youth Ministries
        </p>
        <Image
          alt="Youth Ministries logo"
          className="mx-auto mb-6 h-auto w-36 sm:w-40"
          height={900}
          priority
          src="/images/youth-ministries-logo.png"
          width={900}
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
