import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { requireCapability } from "@/features/auth/services/authorization-service";

export const metadata: Metadata = {
  title: "System Settings",
};

export default async function SystemSettingsPage() {
  const account = await requireCapability("administration.manage");
  if (account.role !== "platform_administrator") notFound();

  return (
    <div className="space-y-7">
      <header>
        <p className="text-sm font-semibold text-sky-700">Administration</p>
        <h1 className="mt-1 text-3xl font-bold text-slate-950">
          System Settings
        </h1>
        <p className="mt-2 max-w-3xl text-slate-600">
          Platform-level configuration and technical safety controls belong in
          this restricted area.
        </p>
        <Link
          className="mt-4 inline-flex min-h-11 items-center rounded-lg border border-slate-300 px-4 font-semibold text-slate-700 hover:bg-slate-50"
          href="/administration"
        >
          Back to Administration
        </Link>
      </header>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-bold text-slate-950">
          Platform configuration foundation
        </h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
          System Settings is reserved for authentication and infrastructure
          configuration, external service and provider setup, deployment-level
          configuration, system safety controls, and platform-wide technical
          settings.
        </p>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
          Church and ministry operational configuration belongs under Ministry
          Settings.
        </p>
        <p className="mt-4 text-sm font-semibold text-slate-700">
          This foundation page is read-only. No system controls are available.
        </p>
      </section>
    </div>
  );
}
