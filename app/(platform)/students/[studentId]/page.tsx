import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";

import { requireCapability } from "@/features/auth/services/authorization-service";
import {
  ChildDetailsForm,
  ChildRelationshipForm,
} from "@/features/members/components/child-management-forms";
import { ChildTagForms } from "@/features/members/components/child-tag-forms";
import { getChildWorkspace } from "@/features/members/services/child-workspace-service";
import { listMemberTags } from "@/features/members/services/member-directory-service";

export const metadata: Metadata = { title: "Child workspace" };
const studentIdSchema = z.string().uuid();

export default async function ChildWorkspacePage({
  params,
}: Readonly<{ params: Promise<{ studentId: string }> }>) {
  await requireCapability("students.view");
  const parsedId = studentIdSchema.safeParse((await params).studentId);
  if (!parsedId.success) notFound();

  const result = await getChildWorkspace(parsedId.data);
  if (!result.success) {
    if (result.reason === "denied") notFound();
    return (
      <section className="rounded-xl border border-red-200 bg-red-50 p-5 text-red-900">
        This child workspace is temporarily unavailable. Refresh and try again.
      </section>
    );
  }

  const { child } = result;
  const allTags = child.canManage ? await listMemberTags() : [];
  return (
    <div className="space-y-8">
      <section>
        <Link className="text-sm font-semibold text-sky-700 hover:text-sky-900" href="/students">
          ← Back to members
        </Link>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-950">
          {child.displayName}
        </h1>
        <p className="mt-2 text-base text-slate-600">
          Grade {child.grade} · {child.status} · {child.householdName}
        </p>
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-950">Child overview</h2>
          <dl className="mt-4 space-y-3 text-sm">
            <div><dt className="text-slate-500">Birth date</dt><dd className="font-medium text-slate-900">{child.birthDate}</dd></div>
            <div><dt className="text-slate-500">Grade</dt><dd className="font-medium text-slate-900">{child.grade}</dd></div>
            <div><dt className="text-slate-500">Family</dt><dd className="font-medium text-slate-900">{child.householdName}</dd></div>
          </dl>
          {child.tags.length > 0 ? (
            <ul className="mt-5 flex flex-wrap gap-2">
              {child.tags.map((tag) => (
                <li className="rounded-full border px-2.5 py-1 text-xs font-medium" key={tag.id} style={{ borderColor: tag.color, color: tag.color }}>
                  {tag.name}
                </li>
              ))}
            </ul>
          ) : null}
        </section>

        <section className="rounded-xl border border-amber-200 bg-amber-50 p-5 shadow-sm lg:col-span-2">
          <h2 className="text-lg font-semibold text-amber-950">Medical and care information</h2>
          {child.canViewMedical ? (
            <dl className="mt-4 grid gap-4 md:grid-cols-3 text-sm">
              <div><dt className="font-medium text-amber-900">Medical</dt><dd className="mt-1 whitespace-pre-wrap text-amber-950">{child.medicalSummary || "None recorded"}</dd></div>
              <div><dt className="font-medium text-amber-900">Allergies</dt><dd className="mt-1 whitespace-pre-wrap text-amber-950">{child.allergySummary || "None recorded"}</dd></div>
              <div><dt className="font-medium text-amber-900">Dietary</dt><dd className="mt-1 whitespace-pre-wrap text-amber-950">{child.dietarySummary || "None recorded"}</dd></div>
            </dl>
          ) : (
            <p className="mt-4 text-sm text-amber-900">
              Medical information requires ministry management access or an explicitly recorded legal-guardian relationship.
            </p>
          )}
        </section>
      </div>

      {child.canManage ? (
        <section className="space-y-6 rounded-xl border border-sky-200 bg-sky-50/50 p-5 shadow-sm">
          <div>
            <p className="text-sm font-semibold text-sky-700">Ministry management</p>
            <h2 className="mt-1 text-xl font-semibold text-slate-950">Edit child and permissions</h2>
            <p className="mt-1 text-sm text-slate-600">Medical and relationship changes are audited without copying sensitive note contents into the audit log.</p>
          </div>
          <ChildDetailsForm child={child} />
          <div className="space-y-4">
            {child.relationships.map((relationship) => (
              <ChildRelationshipForm key={relationship.personId} relationship={relationship} studentId={child.id} />
            ))}
          </div>
          <ChildTagForms
            allTags={allTags}
            assignedTagIds={child.tags.map((tag) => tag.id)}
            studentId={child.id}
          />
        </section>
      ) : null}
    </div>
  );
}
