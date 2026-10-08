import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";

import {
  CapabilityGrantForm,
  CapabilityRevokeForm,
} from "@/features/auth/components/administration-capability-grants";
import { getManagedAccountAccess } from "@/features/auth/services/account-management-service";
import { requireCapability } from "@/features/auth/services/authorization-service";
import { roleLabels } from "@/features/auth/types/authorization";

import type { PlatformCapability } from "@/features/auth/types/authorization";

export const metadata: Metadata = { title: "Effective Access" };

function capabilityLabel(capability: PlatformCapability) {
  const words = capability.replaceAll(/[._-]+/g, " ").split(" ");
  const operation = words.pop();
  const subject = words.join(" ");

  const operationLabels: Record<string, string> = {
    confirm: "confirmation",
    manage: "management",
    override: "override",
    submit: "submission",
    verify: "verification",
    view: "viewing",
  };

  const label = [
    subject,
    operation ? operationLabels[operation] ?? operation : "",
  ]
    .filter(Boolean)
    .join(" ");

  return label.charAt(0).toUpperCase() + label.slice(1);
}

const sourceLabels = {
  both: "Role and explicit grant",
  "explicit-grant": "Explicit grant",
  role: "Role",
} as const;

export default async function AccountAccessPage({
  params,
}: Readonly<{
  params: Promise<{ profileId: string }>;
}>) {
  const actor = await requireCapability("administration.manage");

  const parsedProfileId = z
    .string()
    .uuid()
    .safeParse((await params).profileId);

  if (!parsedProfileId.success) {
    notFound();
  }

  const result = await getManagedAccountAccess(parsedProfileId.data);

  if (!result.success && result.reason === "invalid") {
    notFound();
  }

  if (!result.success && result.reason === "denied") {
    notFound();
  }

  if (!result.success) {
    return (
      <div className="space-y-6">
        <Link
          className="text-sm font-semibold text-sky-700"
          href="/administration/accounts"
        >
          ← Back to Accounts
        </Link>

        <section
          className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-amber-950"
          role="alert"
        >
          Effective access is temporarily unavailable. Please try again.
        </section>
      </div>
    );
  }

  const {
    account,
    effectiveCapabilities,
    explicitGrants,
    roleCapabilities,
  } = result.access;

  if (
    actor.role === "youth_pastor" &&
    account.primaryRole === "platform_administrator"
  ) {
    notFound();
  }

  const dateFormatter = new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  const grantableCapabilities: readonly PlatformCapability[] =
    actor.role === "platform_administrator"
      ? [
          "forms.medical.view",
          "forms.medical.verify",
          "forms.participation.override",
        ]
      : ["forms.medical.view", "forms.medical.verify"];

  const canManageGrants =
    account.primaryRole === "staff_member" &&
    account.status === "active";

  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm font-semibold text-sky-700">
          Administration
        </p>

        <h1 className="mt-1 text-3xl font-bold text-slate-950">
          {account.displayName}
        </h1>

        <p className="mt-2 text-slate-600">
          Review this account&apos;s effective access and where it comes from.
        </p>

        <Link
          className="mt-4 inline-flex min-h-11 items-center rounded-lg border border-slate-300 px-4 font-semibold text-slate-700 hover:bg-slate-50"
          href="/administration/accounts"
        >
          Back to Accounts
        </Link>
      </header>

      <section className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
        <h2 className="font-bold text-slate-950">
          Account
        </h2>

        <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <dt className="font-semibold text-slate-500">
              Display name
            </dt>
            <dd className="mt-0.5 text-slate-900">
              {account.displayName}
            </dd>
          </div>

          <div>
            <dt className="font-semibold text-slate-500">
              Email
            </dt>
            <dd className="mt-0.5 break-all text-slate-900">
              {account.email}
            </dd>
          </div>

          <div>
            <dt className="font-semibold text-slate-500">
              Primary role
            </dt>
            <dd className="mt-0.5 text-slate-900">
              {roleLabels[account.primaryRole]}
            </dd>
          </div>

          <div>
            <dt className="font-semibold text-slate-500">
              Status
            </dt>
            <dd className="mt-0.5 capitalize text-slate-900">
              {account.status}
            </dd>
          </div>
        </dl>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div>
          <h2 className="font-bold text-slate-950">
            Effective capabilities
          </h2>

          <p className="mt-1 text-sm text-slate-600">
            Current capabilities combined from the primary role and active
            explicit grants.
          </p>

          {account.status !== "active" ? (
            <p className="mt-2 text-sm font-medium text-amber-800">
              This account is not active, so it currently has no effective
              platform access.
            </p>
          ) : null}
        </div>

        {effectiveCapabilities.length === 0 ? (
          <p className="mt-3 text-sm text-slate-600">
            {account.status === "active"
              ? "No effective capabilities."
              : "No effective capabilities while this account is inactive."}
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-slate-100">
            {effectiveCapabilities.map((item) => (
              <li
                className="flex flex-wrap items-center justify-between gap-2 py-2"
                key={item.capability}
              >
                <div className="min-w-0">
                  <p
                    className="text-sm font-semibold text-slate-900"
                    title={item.capability}
                  >
                    {capabilityLabel(item.capability)}
                  </p>

                  <p className="truncate font-mono text-xs text-slate-500">
                    {item.capability}
                  </p>
                </div>

                <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700">
                  {sourceLabels[item.source]}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="font-bold text-slate-950">
          Primary role access
        </h2>

        <p className="mt-1 text-sm text-slate-600">
          Inherited from {roleLabels[account.primaryRole]}.
        </p>

        <ul className="mt-3 grid gap-x-6 gap-y-2 sm:grid-cols-2">
          {roleCapabilities.map((capability) => (
            <li
              className="min-w-0 text-sm text-slate-800"
              key={capability}
              title={capability}
            >
              <span className="font-semibold">
                {capabilityLabel(capability)}
              </span>

              <span className="ml-2 font-mono text-xs text-slate-500">
                {capability}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="font-bold text-slate-950">
          Explicit capability grants
        </h2>

        {canManageGrants ? (
          <CapabilityGrantForm
            capabilities={grantableCapabilities}
            profileId={account.id}
          />
        ) : (
          <p className="mt-2 text-sm text-slate-600">
            Explicit grants can be managed only for active Staff Members.
          </p>
        )}

        {explicitGrants.length === 0 ? (
          <p className="mt-2 text-sm text-slate-600">
            No explicit capability grants.
          </p>
        ) : (
          <div className="mt-3 divide-y divide-slate-100">
            {explicitGrants.map((grant) => (
              <article
                className="grid gap-2 py-3 text-sm lg:grid-cols-[minmax(11rem,1.1fr)_minmax(12rem,1.5fr)_minmax(9rem,1fr)_8rem_9rem]"
                key={grant.id}
              >
                <div className="min-w-0">
                  <p
                    className="font-semibold text-slate-900"
                    title={grant.capability}
                  >
                    {capabilityLabel(grant.capability)}
                  </p>

                  <p className="truncate font-mono text-xs text-slate-500">
                    {grant.capability}
                  </p>
                </div>

                <p className="text-slate-700">
                  <span className="font-semibold lg:hidden">
                    Reason:{" "}
                  </span>
                  {grant.grantReason}
                </p>

                <p className="text-slate-700">
                  <span className="font-semibold lg:hidden">
                    Granted by:{" "}
                  </span>

                  {grant.grantedBy}

                  <span className="block text-xs text-slate-500">
                    {dateFormatter.format(new Date(grant.grantedAt))}
                  </span>
                </p>

                <p className="text-slate-700">
                  <span className="font-semibold lg:hidden">
                    Expires:{" "}
                  </span>

                  {grant.expiresAt
                    ? dateFormatter.format(new Date(grant.expiresAt))
                    : "No expiration"}
                </p>

                <div>
                  <span
                    className={`rounded px-2 py-0.5 text-xs font-semibold capitalize ${
                      grant.status === "active"
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-slate-100 text-slate-700"
                    }`}
                  >
                    {grant.status}
                  </span>

                  {grant.revokedAt ? (
                    <span className="mt-1 block text-xs text-slate-500">
                      {dateFormatter.format(new Date(grant.revokedAt))}
                      {grant.revokedBy
                        ? ` by ${grant.revokedBy}`
                        : ""}
                      {grant.revocationReason
                        ? ` · ${grant.revocationReason}`
                        : ""}
                    </span>
                  ) : null}

                  {canManageGrants && grant.status === "active" ? (
                    <CapabilityRevokeForm
                      grantId={grant.id}
                      profileId={account.id}
                    />
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}