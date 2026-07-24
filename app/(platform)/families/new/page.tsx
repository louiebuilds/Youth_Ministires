import type { Metadata } from "next";
import Link from "next/link";

import { requireCapability } from "@/features/auth/services/authorization-service";
import { CreateFamilyForm } from "@/features/members/components/create-family-form";

export const metadata: Metadata = { title: "New family" };

export default async function NewFamilyPage() {
  await requireCapability("members.manage");
  return (
    <div className="space-y-8">
      <section>
        <Link className="text-sm font-semibold text-sky-700" href="/families">
          ← Back to families
        </Link>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-950">
          New family
        </h1>
        <p className="mt-2 max-w-3xl text-slate-600">
          Create the family and its first responsible adult together. Use
          synthetic records only in development.
        </p>
      </section>
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <CreateFamilyForm />
      </section>
    </div>
  );
}
