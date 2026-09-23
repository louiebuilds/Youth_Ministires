import { notFound } from "next/navigation";

import { requireCapability } from "@/features/auth/services/authorization-service";
import {
  ArchiveTemplateForm,
  BlankMasterUpload,
  VersionDraftForm,
  VersionLifecycleForm,
} from "@/features/forms/components/document-template-forms";
import {
  listDocumentTemplates,
  listDocumentTemplateVersions,
} from "@/features/forms/services/document-template-service";

export default async function DocumentTemplatePage({
  params,
}: Readonly<{ params: Promise<{ templateId: string }> }>) {
  const account=await requireCapability("forms.documents.manage");
  if(account.role!=="platform_administrator"&&account.role!=="youth_pastor")notFound();
  const { templateId } = await params;
  const [templates, versions] = await Promise.all([
    listDocumentTemplates(),
    listDocumentTemplateVersions(templateId),
  ]);
  const template = templates.find((item) => item.templateId === templateId);
  if (!template) notFound();
  const draft = versions.find((version) => version.status === "draft");

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-sky-700">Document template</p>
          <h1 className="mt-1 text-3xl font-bold">{template.name}</h1>
          <p className="mt-2 text-slate-600">{template.description ?? "No description provided."}</p>
        </div>
        {template.status !== "archived" ? <ArchiveTemplateForm templateId={templateId} /> : null}
      </header>

      {template.status === "active" ? (
        <section className="rounded-xl border bg-white p-5">
          <h2 className="mb-4 text-xl font-bold">{draft ? `Edit draft v${draft.versionNumber}` : "Create draft version"}</h2>
          <VersionDraftForm templateId={templateId} version={draft} />
        </section>
      ) : null}

      <section className="space-y-4">
        <h2 className="text-2xl font-bold">Version history</h2>
        {versions.map((version) => (
          <article className="rounded-xl border bg-white p-5" key={version.versionId}>
            <div className="flex flex-wrap justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold">Version {version.versionNumber}</h3>
                <p className="text-sm text-slate-600">
                  {version.validityPolicy.replaceAll("_", " ")}
                  {version.effectiveFrom ? ` · Effective ${version.effectiveFrom}` : ""}
                  {version.effectiveTo ? ` through ${version.effectiveTo}` : ""}
                </p>
              </div>
              <span className="font-semibold capitalize">{version.status}</span>
            </div>
            <div className="mt-4 flex flex-wrap items-start gap-3 border-t pt-4">
              {version.status === "draft" && !version.hasMaster ? <BlankMasterUpload versionId={version.versionId} /> : null}
              {version.hasMaster ? (
                <a
                  className="inline-flex min-h-11 items-center rounded-lg border px-4 font-semibold"
                  href={`/api/forms/templates/${version.versionId}/download`}
                >
                  Download blank master
                </a>
              ) : null}
              {version.status === "draft" && version.hasMaster ? (
                <VersionLifecycleForm versionId={version.versionId} mode="publish" />
              ) : null}
              {version.status === "published" ? (
                <VersionLifecycleForm versionId={version.versionId} mode="retire" />
              ) : null}
            </div>
            {version.originalFileName ? (
              <p className="mt-2 text-xs text-slate-500">
                {version.originalFileName} · {Math.ceil((version.fileSizeBytes ?? 0) / 1024)} KB
              </p>
            ) : null}
          </article>
        ))}
        {!versions.length ? <p className="rounded-xl border bg-white p-6 text-slate-600">No versions yet.</p> : null}
      </section>
    </div>
  );
}
