import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { requireCapability } from "@/features/auth/services/authorization-service";
import { CommunicationTemplateForm } from "@/features/communications/components/template-forms";
import { getCommunicationTemplate } from "@/features/communications/services/communication-service";

export const metadata: Metadata = { title: "Edit Communication Template" };

export default async function EditCommunicationTemplatePage({ params }: Readonly<{
  params: Promise<{ templateId: string }>;
}>) {
  await requireCapability("communications.manage");
  const { templateId } = await params;
  const template = await getCommunicationTemplate(templateId);
  if (!template || template.archivedAt) notFound();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header>
        <Link className="text-sm font-semibold text-sky-700"
          href={`/communications/templates/${template.templateId}`}>
          ← Template details
        </Link>
        <h1 className="mt-2 text-3xl font-bold">Edit communication template</h1>
        <p className="mt-2 text-slate-600">
          Update the reusable content for {template.name}.
        </p>
      </header>
      <section className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
        <CommunicationTemplateForm template={template} />
      </section>
    </div>
  );
}
