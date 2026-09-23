import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";

import { requireCapability } from "@/features/auth/services/authorization-service";
import {
  AddFamilyAdultForm,
  FamilyAdultForm,
  FamilyDetailsForm,
} from "@/features/members/components/family-management-forms";
import { ParentAccountLinkForm } from "@/features/members/components/parent-account-link-form";
import {
  getFamilyWorkspace,
  listParentAccountLinkCandidates,
} from "@/features/members/services/family-directory-service";

export const metadata: Metadata = {
  title: "Family workspace",
};

const householdIdSchema = z.string().uuid();

export default async function FamilyWorkspacePage({
  params,
}: Readonly<{
  params: Promise<{ householdId: string }>;
}>) {
  const account = await requireCapability("families.view");
  const parsedId = householdIdSchema.safeParse((await params).householdId);

  if (!parsedId.success) {
    notFound();
  }

  const result = await getFamilyWorkspace(parsedId.data);

  if (!result.success) {
    if (result.reason === "denied") {
      notFound();
    }

    return (
      <section className="rounded-xl border border-red-200 bg-red-50 p-5 text-red-900">
        This family workspace is temporarily unavailable. Refresh and try again.
      </section>
    );
  }

  const { family } = result;
  const canLinkAccounts = account.role === "platform_administrator" || account.role === "youth_pastor";
  const accountCandidates = canLinkAccounts
    ? new Map(await Promise.all(
        family.adults.filter((adult) => adult.isResponsibleAdult).map(async (adult) => [
          adult.id,
          await listParentAccountLinkCandidates(adult.id),
        ] as const),
      ))
    : new Map();
  const address = [
    family.addressLine1,
    family.addressLine2,
    [family.city, family.region].filter(Boolean).join(", "),
    family.postalCode,
  ].filter(Boolean);

  return (
    <div className="space-y-8">
      <section>
        <Link
          className="text-sm font-semibold text-sky-700 hover:text-sky-900"
          href="/families"
        >
          ← Back to families
        </Link>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-950">
          {family.name}
        </h1>
        <p className="mt-2 text-base capitalize text-slate-600">
          {family.status} family
        </p>
      </section>

      <div className="grid gap-6 xl:grid-cols-3">
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-950">
            Mailing address
          </h2>
          {address.length > 0 ? (
            <address className="mt-4 space-y-1 text-sm not-italic leading-6 text-slate-700">
              {address.map((line) => (
                <p key={line}>{line}</p>
              ))}
              <p>{family.countryCode}</p>
            </address>
          ) : (
            <p className="mt-4 text-sm text-slate-600">
              No mailing address is recorded.
            </p>
          )}
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm xl:col-span-2">
          <h2 className="text-lg font-semibold text-slate-950">
            Adults and contacts
          </h2>
          {family.adults.length === 0 ? (
            <p className="mt-4 text-sm text-slate-600">
              No adult contacts are recorded.
            </p>
          ) : (
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              {family.adults.map((adult) => (
                <article
                  className="rounded-lg border border-slate-200 p-4"
                  key={adult.id}
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <h3 className="font-semibold text-slate-950">
                        {adult.preferredName || adult.firstName} {adult.lastName}
                      </h3>
                      <p className="mt-1 text-sm text-slate-600">
                        {adult.relationshipLabel}
                      </p>
                    </div>
                    {adult.isPrimaryContact ? (
                      <span className="rounded-full bg-sky-100 px-2.5 py-1 text-xs font-semibold text-sky-800">
                        Primary contact
                      </span>
                    ) : null}
                  </div>
                  <dl className="mt-4 space-y-2 text-sm">
                    <div>
                      <dt className="text-slate-500">Email</dt>
                      <dd className="break-all text-slate-900">
                        {adult.email || "Not provided"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">Phone</dt>
                      <dd className="text-slate-900">
                        {adult.phone || "Not provided"}
                      </dd>
                    </div>
                  </dl>
                  <ul className="mt-4 flex flex-wrap gap-2 text-xs text-slate-700">
                    {adult.receiveEmail ? <li>Email updates</li> : null}
                    {adult.receiveSms ? <li>Text updates</li> : null}
                    {adult.receiveEmergencyNotifications ? (
                      <li>Emergency alerts</li>
                    ) : null}
                  </ul>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-950">Children</h2>
        {family.children.length === 0 ? (
          <p className="mt-4 text-sm text-slate-600">
            No active child records are connected to this family.
          </p>
        ) : (
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {family.children.map((child) => (
              <Link
                className="rounded-lg border border-slate-200 p-4"
                href={`/students/${child.id}`}
                key={child.id}
              >
                <h3 className="font-semibold text-slate-950">
                  {child.displayName}
                </h3>
                <p className="mt-2 text-sm text-slate-600">
                  Grade {child.grade} · {child.status}
                </p>
              </Link>
            ))}
          </div>
        )}
      </section>

      {account.role !== "parent" ? (
        <section className="space-y-6 rounded-xl border border-sky-200 bg-sky-50/50 p-5 shadow-sm">
          <div>
            <p className="text-sm font-semibold text-sky-700">
              Ministry management
            </p>
            <h2 className="mt-1 text-xl font-semibold text-slate-950">
              Edit family and contacts
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              These changes are validated and recorded in the audit log.
            </p>
          </div>
          <div>
            <Link
              className="inline-flex min-h-11 items-center rounded-lg bg-sky-700 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-800"
              href={`/families/${family.id}/children/new`}
            >
              Add child
            </Link>
          </div>
          <FamilyDetailsForm family={family} />
          <div className="space-y-4">
            {family.adults.map((adult) => (
              <div className="space-y-3" key={adult.id}>
                <FamilyAdultForm adult={adult} householdId={family.id} />
                {canLinkAccounts && adult.isResponsibleAdult ? (
                  <ParentAccountLinkForm
                    adult={adult}
                    candidates={accountCandidates.get(adult.id) ?? []}
                    householdId={family.id}
                  />
                ) : null}
              </div>
            ))}
            <AddFamilyAdultForm householdId={family.id} />
          </div>
        </section>
      ) : null}
    </div>
  );
}
