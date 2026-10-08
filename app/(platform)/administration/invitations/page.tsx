import type { Metadata } from "next";
import Link from "next/link";

import {
  AdministrationInvitationForm,
  RevokeManagedInvitationButton,
} from "@/features/auth/components/administration-invitation-form";
import { requireCapability } from "@/features/auth/services/authorization-service";
import { listManagedInvitations } from "@/features/auth/services/invitation-management-service";
import { roleLabels } from "@/features/auth/types/authorization";

export const metadata: Metadata = {
  title: "Invitations",
};

export default async function InvitationsPage({
  searchParams,
}: Readonly<{
  searchParams: Promise<{ notice?: string | string[] }>;
}>) {
  const account = await requireCapability("administration.manage");
  const notice = (await searchParams).notice;
  const result = await listManagedInvitations();

  const dateFormatter = new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
  });

  return (
    <div className="space-y-8">
      <header>
        <p className="text-sm font-semibold text-sky-700">Administration</p>
        <h1 className="mt-1 text-3xl font-bold text-slate-950">
          Invitations
        </h1>
        <p className="mt-2 text-slate-600">
          Review invitations for ministry platform access.
        </p>

        <Link
          className="mt-4 inline-flex min-h-11 items-center rounded-lg border border-slate-300 px-4 font-semibold text-slate-700 hover:bg-slate-50"
          href="/administration"
        >
          Back to Administration
        </Link>
      </header>

      <AdministrationInvitationForm currentRole={account.role} />

      {notice === "revoked" ? (
        <p
          className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900"
          role="status"
        >
          Invitation revoked successfully.
        </p>
      ) : null}

      {!result.success ? (
        <section
          className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-amber-950"
          role="alert"
        >
          <h2 className="font-bold">Invitations could not be loaded</h2>
          <p className="mt-1 text-sm">
            {result.reason === "denied"
              ? "You do not have permission to view invitations."
              : "Invitation management is temporarily unavailable. Please try again."}
          </p>
        </section>
      ) : result.invitations.length === 0 ? (
        <section className="rounded-xl border border-slate-200 bg-white p-5 text-slate-600 shadow-sm">
          No invitations yet.
        </section>
      ) : (
        <section
          aria-label="Managed invitations"
          className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
        >
          <div className="hidden gap-4 border-b border-slate-200 bg-slate-50 px-4 py-3 text-xs font-bold uppercase tracking-wide text-slate-500 md:grid md:grid-cols-[minmax(0,1.75fr)_minmax(9rem,1fr)_7rem_8rem_8rem_6rem]">
            <span>Email</span>
            <span>Intended role</span>
            <span>Status</span>
            <span>Invited</span>
            <span>Expires</span>
            <span>Action</span>
          </div>
          <div className="divide-y divide-slate-200">
            {result.invitations.map((invitation) => (
              <article
                className="grid gap-3 px-4 py-4 md:grid-cols-[minmax(0,1.75fr)_minmax(9rem,1fr)_7rem_8rem_8rem_6rem] md:items-center md:gap-4"
                key={invitation.id}
              >
                <p className="break-all font-semibold text-slate-950">
                  {invitation.email}
                </p>
                <p className="text-sm text-slate-700">
                  <span className="font-semibold md:hidden">Intended role: </span>
                  {roleLabels[invitation.intendedPrimaryRole]}
                </p>
                <p className="text-sm capitalize text-slate-700">
                  <span className="font-semibold md:hidden">Status: </span>
                  {invitation.status}
                </p>
                <p className="text-sm text-slate-700">
                  <span className="font-semibold md:hidden">Invited: </span>
                  {dateFormatter.format(new Date(invitation.invitedAt))}
                </p>
                <p className="text-sm text-slate-700">
                  <span className="font-semibold md:hidden">Expires: </span>
                  {dateFormatter.format(new Date(invitation.expiresAt))}
                </p>
                <div>
                  {invitation.status === "pending" &&
                  (account.role === "platform_administrator" ||
                    invitation.intendedPrimaryRole !==
                      "platform_administrator") ? (
                    <RevokeManagedInvitationButton
                      invitationId={invitation.id}
                    />
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
