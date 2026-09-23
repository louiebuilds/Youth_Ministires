import type { Metadata } from "next";
import Link from "next/link";

import { requireCapability } from "@/features/auth/services/authorization-service";
import { CommunicationTemplateForm } from "@/features/communications/components/template-forms";

export const metadata: Metadata = { title: "New Communication Template" };

export default async function NewCommunicationTemplatePage() {
  await requireCapability("communications.manage");

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header>
        <Link className="text-sm font-semibold text-sky-700" href="/communications/templates">
          ← Communication templates
        </Link>
        <h1 className="mt-2 text-3xl font-bold">New communication template</h1>
        <p className="mt-2 text-slate-600">
          Create reusable message content for one delivery channel.
        </p>
      </header>
      <section className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
        <CommunicationTemplateForm />
      </section>
    </div>
  );
}
