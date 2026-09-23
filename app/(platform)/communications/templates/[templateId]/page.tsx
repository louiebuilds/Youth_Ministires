import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { requireCapability } from "@/features/auth/services/authorization-service";
import { ArchiveCommunicationTemplateForm } from "@/features/communications/components/template-forms";
import { getCommunicationTemplate } from "@/features/communications/services/communication-service";

export const metadata: Metadata = { title: "Communication Template" };

export default async function CommunicationTemplatePage({ params }: Readonly<{
  params: Promise<{ templateId: string }>;
}>) {
  await requireCapability("communications.manage");
  const { templateId } = await params;
  const template = await getCommunicationTemplate(templateId);
  if (!template) notFound();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header>
        <Link className="text-sm font-semibold text-sky-700" href="/communications/templates">
          ← Communication templates
        </Link>
        <div className="mt-2 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
              Communication template
            </p>
            <h1 className="mt-1 text-3xl font-bold">{template.name}</h1>
          </div>
          {!template.archivedAt ? (
            <Link className="inline-flex min-h-11 items-center justify-center rounded-lg bg-sky-700 px-5 font-semibold text-white"
              href={`/communications/templates/${template.templateId}/edit`}>Edit</Link>
          ) : null}
        </div>
      </header>
      <section className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
        <dl className="grid gap-4 sm:grid-cols-2">
          <div><dt className="text-sm font-semibold text-slate-600">Channel</dt><dd className="mt-1">{channelLabels[template.channel]}</dd></div>
          <div><dt className="text-sm font-semibold text-slate-600">Last updated</dt><dd className="mt-1">{formatDate(template.updatedAt)}</dd></div>
          {template.subject ? <div className="sm:col-span-2"><dt className="text-sm font-semibold text-slate-600">Email subject</dt><dd className="mt-1">{template.subject}</dd></div> : null}
        </dl>
        <div className="mt-6 border-t border-slate-200 pt-6">
          <h2 className="font-bold">Message</h2>
          <p className="mt-3 whitespace-pre-wrap leading-7 text-slate-700">{template.messageBody}</p>
        </div>
      </section>
      {!template.archivedAt ? (
        <section className="rounded-xl border border-red-200 bg-red-50 p-5">
          <h2 className="font-bold text-red-900">Archive template</h2>
          <p className="mt-1 text-sm text-red-800">Archive this template when it should no longer be selected for new communications.</p>
          <ArchiveCommunicationTemplateForm templateId={template.templateId} />
        </section>
      ) : <p className="font-semibold text-slate-600">This template is archived.</p>}
    </div>
  );
}

const channelLabels = { in_app: "In-app", email: "Email", sms: "SMS" } as const;
function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeZone: "America/Chicago" }).format(new Date(value));
}
