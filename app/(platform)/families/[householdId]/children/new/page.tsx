import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";

import { requireCapability } from "@/features/auth/services/authorization-service";
import { CreateChildForm } from "@/features/members/components/create-child-form";
import { getFamilyWorkspace } from "@/features/members/services/family-directory-service";

export const metadata: Metadata = { title: "Add child" };
const householdIdSchema = z.string().uuid();

export default async function NewChildPage({
  params,
}: Readonly<{ params: Promise<{ householdId: string }> }>) {
  await requireCapability("members.manage");
  const parsedId = householdIdSchema.safeParse((await params).householdId);
  if (!parsedId.success) notFound();
  const result = await getFamilyWorkspace(parsedId.data);
  if (!result.success) notFound();

  return (
    <div className="space-y-8">
      <section>
        <Link
          className="text-sm font-semibold text-sky-700"
          href={`/families/${result.family.id}`}
        >
          ← Back to {result.family.name}
        </Link>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-950">
          Add child
        </h1>
        <p className="mt-2 text-slate-600">
          Create a child record and select the initial legal guardian from this
          family’s responsible adults.
        </p>
      </section>
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <CreateChildForm
          adults={result.family.adults}
          householdId={result.family.id}
        />
      </section>
    </div>
  );
}
