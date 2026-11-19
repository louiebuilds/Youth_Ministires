import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { CreateIndependentStudentForm } from "@/features/members/components/create-independent-student-form";
import { requireCapability } from "@/features/auth/services/authorization-service";

export const metadata: Metadata = { title: "Add student" };

export default async function AddStudentPage() {
  const account = await requireCapability("members.manage");
  if (account.role !== "platform_administrator" && account.role !== "youth_pastor") {
    notFound();
  }

  return (
    <div className="space-y-8">
      <header>
        <Link className="text-sm font-semibold text-sky-700" href="/students">← Back to students</Link>
        <h1 className="mt-3 text-3xl font-bold text-slate-950">Add student</h1>
        <p className="mt-2 max-w-3xl text-slate-600">Create a student before a parent or guardian account is available. Link an authorized guardian later from the student workspace.</p>
      </header>
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <CreateIndependentStudentForm />
      </section>
    </div>
  );
}
