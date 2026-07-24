import type { Metadata } from "next";

import { ChangePasswordForm } from "@/features/auth/components/change-password-form";
import { ProfileForm } from "@/features/auth/components/profile-form";
import { requireCapability } from "@/features/auth/services/authorization-service";
import { roleLabels } from "@/features/auth/types/authorization";

export const metadata: Metadata = {
  title: "Profile",
};

export default async function ProfilePage() {
  const account = await requireCapability("dashboard.view");

  return (
    <div className="space-y-8">
      <section aria-labelledby="profile-heading">
        <p className="text-sm font-semibold text-sky-700">Account</p>
        <h1
          className="mt-1 text-3xl font-bold tracking-tight text-slate-950"
          id="profile-heading"
        >
          Your profile
        </h1>
        <p className="mt-2 max-w-3xl text-base leading-7 text-slate-600">
          Keep your account display name current and manage your password
          securely.
        </p>
      </section>

      <div className="grid gap-6 xl:grid-cols-2">
        <section
          aria-labelledby="profile-details-heading"
          className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
        >
          <h2
            className="text-lg font-semibold text-slate-950"
            id="profile-details-heading"
          >
            Profile details
          </h2>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            Your role and sign-in email are protected account attributes.
          </p>
          <div className="mt-6">
            <ProfileForm
              displayName={account.displayName}
              email={account.email}
              roleLabel={roleLabels[account.role]}
            />
          </div>
        </section>

        <section
          aria-labelledby="change-password-heading"
          className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
        >
          <h2
            className="text-lg font-semibold text-slate-950"
            id="change-password-heading"
          >
            Change password
          </h2>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            For security, changing your password signs this account out.
          </p>
          <div className="mt-6">
            <ChangePasswordForm />
          </div>
        </section>
      </div>
    </div>
  );
}
