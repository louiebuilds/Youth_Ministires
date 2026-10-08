import type { Metadata } from "next";

import { InvitationSessionGate } from "@/features/auth/components/invitation-session-gate";

export const metadata: Metadata = {
  title: "Complete your account",
};

export default function AcceptInvitationPage() {
  return (
    <div>
      <div className="mb-8">
        <p className="text-sm font-semibold text-sky-700">
          Account invitation
        </p>

        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
          Complete your account
        </h1>

        <p className="mt-3 text-sm leading-6 text-slate-600">
          Choose a password to finish setting up your ministry account.
        </p>
      </div>

      <InvitationSessionGate />
    </div>
  );
}