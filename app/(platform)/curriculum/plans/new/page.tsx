import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { requireCapability } from "@/features/auth/services/authorization-service";
import { CurriculumPlanForm } from "@/features/curriculum/components/curriculum-plan-forms";

export const metadata: Metadata = { title: "Create Curriculum Plan" };

export default async function NewCurriculumPlanPage() {
  const account = await requireCapability("curriculum.view");
  if (!["platform_administrator", "youth_pastor", "staff_member"]
    .includes(account.role)) notFound();
  return (
    <div className="space-y-6">
      <header>
        <Link className="text-sm font-semibold text-sky-700" href="/curriculum">
          ← Back to curriculum
        </Link>
        <h1 className="mt-3 text-3xl font-bold">Create curriculum plan</h1>
      </header>
      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <CurriculumPlanForm />
      </section>
    </div>
  );
}
