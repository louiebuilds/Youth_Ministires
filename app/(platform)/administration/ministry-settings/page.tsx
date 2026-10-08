import type { Metadata } from "next";
import Link from "next/link";

import { MinistrySettingsForm } from "@/features/administration/components/ministry-settings-form";
import { getMinistrySettings } from "@/features/administration/services/ministry-settings-service";
import { requireCapability } from "@/features/auth/services/authorization-service";

export const metadata: Metadata = {
  title: "Ministry Settings",
};

export default async function MinistrySettingsPage() {
  await requireCapability("administration.manage");

  const result = await getMinistrySettings();

  return (
    <div className="space-y-7">
      <header>
        <p className="text-sm font-semibold text-sky-700">
          Administration
        </p>

        <h1 className="mt-1 text-3xl font-bold text-slate-950">
          Ministry Settings
        </h1>

        <p className="mt-2 max-w-3xl text-slate-600">
          Manage ministry-wide operational settings used throughout the
          platform.
        </p>

        <Link
          className="mt-4 inline-flex min-h-11 items-center rounded-lg border border-slate-300 px-4 font-semibold text-slate-700 hover:bg-slate-50"
          href="/administration"
        >
          Back to Administration
        </Link>
      </header>

      {result.success ? (
        <MinistrySettingsForm settings={result.settings} />
      ) : (
        <section
          className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-amber-950"
          role="alert"
        >
          <h2 className="font-bold">
            Ministry Settings could not be loaded
          </h2>

          <p className="mt-1 text-sm">
            {result.reason === "denied"
              ? "You do not have permission to view Ministry Settings."
              : "Ministry Settings are temporarily unavailable. Please try again."}
          </p>
        </section>
      )}
    </div>
  );
}