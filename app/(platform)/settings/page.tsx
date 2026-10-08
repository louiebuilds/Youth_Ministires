import type { Metadata } from "next";

import { ProfileForm } from "@/features/auth/components/profile-form";
import { requireCapability } from "@/features/auth/services/authorization-service";
import { roleLabels } from "@/features/auth/types/authorization";

export const metadata: Metadata = {
  title: "My account",
};

export default async function SettingsPage() {
  const account = await requireCapability("dashboard.view");

  return (
    <div className="space-y-7">
      <header>
        <p className="text-sm font-semibold text-sky-700">Settings</p>
        <h1
          className="mt-1 text-3xl font-bold tracking-tight text-slate-950"
        >
          My account
        </h1>
        <p className="mt-2 max-w-3xl text-base leading-7 text-slate-600">
          Manage your personal account information.
        </p>
      </header>

      <section
        className="max-w-2xl rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
      >
        <h2 className="text-lg font-semibold text-slate-950">
          Account details
        </h2>
        <p className="mt-1 text-sm leading-6 text-slate-600">
          Role and status changes require ministry administration.
        </p>
        <div className="mt-6">
          <ProfileForm
            displayName={account.displayName}
            email={account.email}
            roleLabel={roleLabels[account.role]}
            statusLabel="Active"
          />
        </div>
      </section>
    </div>
  );
}
