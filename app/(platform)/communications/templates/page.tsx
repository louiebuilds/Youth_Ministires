import type { Metadata } from "next";
import Link from "next/link";

import { requireCapability } from "@/features/auth/services/authorization-service";
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
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
        <Link className="text-sm font-semibold text-sky-700"
          href="/communications">← Announcements</Link>
        <h1 className="mt-2 text-3xl font-bold">Communication templates</h1>
        <p className="mt-2 text-slate-600">
          Reusable messages for announcements, email, and SMS.
        </p>
        </div>
        <Link className="inline-flex min-h-11 items-center justify-center rounded-lg bg-sky-700 px-5 font-semibold text-white"
          href="/communications/templates/new">+ New template</Link>
      </header>
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
      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        {templates.length ? (
          <div className="divide-y divide-slate-200">
            <div className="hidden grid-cols-[minmax(0,1fr)_10rem_11rem_auto] gap-4 bg-slate-50 px-5 py-3 text-xs font-bold uppercase tracking-wide text-slate-600 md:grid">
              <span>Template</span><span>Channel</span><span>Last updated</span><span className="sr-only">Action</span>
            </div>
            {templates.map((template) => (
              <article className="grid gap-3 p-5 md:grid-cols-[minmax(0,1fr)_10rem_11rem_auto] md:items-center"
                key={template.templateId}>
                <div className="min-w-0">
                  <h2 className="truncate font-bold text-slate-950">{template.name}</h2>
                  {template.archivedAt ? <p className="text-sm font-semibold text-slate-500">Archived</p> : null}
                </div>
                <p className="text-sm"><span className="font-semibold md:hidden">Channel: </span>{channelLabels[template.channel]}</p>
                <p className="text-sm text-slate-600"><span className="font-semibold md:hidden">Last updated: </span>{formatDate(template.updatedAt)}</p>
                <Link className="inline-flex min-h-11 items-center justify-center rounded-lg border border-slate-300 px-4 font-semibold text-slate-800"
                  href={`/communications/templates/${template.templateId}`}>Open</Link>
              </article>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center">
            <h2 className="text-lg font-bold">No templates match this search.</h2>
            <p className="mt-2 text-slate-600">Create a reusable message when your ministry is ready.</p>
            <Link className="mt-4 inline-flex min-h-11 items-center rounded-lg bg-sky-700 px-5 font-semibold text-white"
              href="/communications/templates/new">New template</Link>
          </div>
        )}
      </section>
    </div>
  );
}

const field =
  "mt-1 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 py-2";

const channelLabels = { in_app: "In-app", email: "Email", sms: "SMS" } as const;

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeZone: "America/Chicago",
  }).format(new Date(value));
}
