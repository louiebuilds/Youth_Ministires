import type { Metadata } from "next";
import Link from "next/link";

import { requireCapability } from "@/features/auth/services/authorization-service";
import {
  ArchiveCommunicationTemplateForm,
  CommunicationTemplateForm,
} from "@/features/communications/components/template-forms";
import { listCommunicationTemplates } from "@/features/communications/services/communication-service";

export const metadata: Metadata = { title: "Communication Templates" };

export default async function CommunicationTemplatesPage({
  searchParams,
}: Readonly<{
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}>) {
  await requireCapability("communications.manage");
  const params = await searchParams;
  const search = typeof params.q === "string" && params.q.trim().length <= 100
    ? params.q.trim() || null : null;
  const includeArchived = params.archived === "true";
  const templates = await listCommunicationTemplates(search, includeArchived);
  return (
    <div className="space-y-8">
      <header>
        <Link className="text-sm font-semibold text-sky-700"
          href="/communications">← Announcements</Link>
        <h1 className="mt-2 text-3xl font-bold">Communication templates</h1>
        <p className="mt-2 text-slate-600">
          Reusable synthetic in-app, email, and SMS message content.
        </p>
      </header>
      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="mb-4 text-xl font-bold">Create template</h2>
        <CommunicationTemplateForm />
      </section>
      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <form className="flex flex-wrap items-end gap-4" method="get">
          <label className="min-w-64 flex-1 text-sm font-semibold">Search
            <input className={field} defaultValue={search ?? ""}
              maxLength={100} name="q" />
          </label>
          <label className="flex min-h-11 items-center gap-2">
            <input defaultChecked={includeArchived} name="archived"
              type="checkbox" value="true" /> Include archived
          </label>
          <button className="min-h-11 rounded-lg bg-slate-900 px-5 font-semibold text-white">
            Search
          </button>
        </form>
      </section>
      <section className="space-y-4">
        {templates.map((template) => (
          <article className="rounded-xl border border-slate-200 bg-white p-5"
            key={template.templateId}>
            <div className="flex justify-between gap-3">
              <h2 className="text-xl font-bold">{template.name}</h2>
              <span className="font-semibold">{template.channel}</span>
            </div>
            {template.archivedAt ? (
              <p className="mt-2 text-sm font-semibold text-slate-500">Archived</p>
            ) : (
              <details className="mt-4">
                <summary className="cursor-pointer font-semibold">Edit template</summary>
                <div className="mt-4">
                  <CommunicationTemplateForm template={template} />
                  <ArchiveCommunicationTemplateForm templateId={template.templateId} />
                </div>
              </details>
            )}
          </article>
        ))}
        {!templates.length ? <p>No templates match this search.</p> : null}
      </section>
    </div>
  );
}

const field =
  "mt-1 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 py-2";
