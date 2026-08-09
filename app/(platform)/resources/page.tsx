import type { Metadata } from "next";

import { requireCapability } from "@/features/auth/services/authorization-service";
import { CategoryCreateForm, CategoryLifecycleForm, ResourceCreateForm, ResourceLifecycleForms } from "@/features/resource-library/components/resource-management-forms";
import { ResourceFileControls } from "@/features/resource-library/components/resource-file-controls";
import { listLibraryResources, listLibraryResourceVersions, listResourceCategories } from "@/features/resource-library/services/resource-library-service";
import type { LibraryResourceAudience, LibraryResourceStatus, LibraryResourceType } from "@/features/resource-library/types/resource-library";

export const metadata: Metadata = { title: "Resource Library" };
const types: LibraryResourceType[] = ["document", "image", "video", "other"];
const audiences: LibraryResourceAudience[] = ["ministry", "volunteer", "family", "all_authenticated"];
const statuses: LibraryResourceStatus[] = ["draft", "published", "archived"];

function one(value: string | string[] | undefined) {
  return typeof value === "string" ? value : null;
}

export default async function ResourceLibraryPage({ searchParams }: Readonly<{ searchParams: Promise<Record<string, string | string[] | undefined>> }>) {
  const account = await requireCapability("resource_library.view");
  const canManage = ["platform_administrator", "youth_pastor", "staff_member"].includes(account.role);
  const params = await searchParams;
  const searchValue = one(params.q);
  const search = searchValue && searchValue.trim().length <= 100 ? searchValue.trim() || null : null;
  const categoryValue = one(params.category);
  const categoryId = categoryValue && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(categoryValue)
    ? categoryValue
    : null;
  const typeValue = one(params.type);
  const resourceType = types.includes(typeValue as LibraryResourceType) ? typeValue as LibraryResourceType : null;
  const audienceValue = one(params.audience);
  const audience = audiences.includes(audienceValue as LibraryResourceAudience) ? audienceValue as LibraryResourceAudience : null;
  const statusValue = one(params.status);
  const status = canManage && statuses.includes(statusValue as LibraryResourceStatus) ? statusValue as LibraryResourceStatus : null;
  const [categories, resources] = await Promise.all([
    listResourceCategories(false),
    listLibraryResources({ search, categoryId, resourceType, audience, status, includeArchived: canManage && status === "archived" }),
  ]);
  const histories = canManage ? await Promise.all(resources.map(async (resource) => [resource.resourceId, await listLibraryResourceVersions(resource.resourceId)] as const)) : [];
  const versionsByResource = new Map(histories);

  return <div className="space-y-8">
    <header><p className="text-sm font-semibold text-sky-700">Shared ministry materials</p><h1 className="mt-1 text-3xl font-bold text-slate-950">Resource Library</h1><p className="mt-2 text-slate-600">Private documents, images, and videos shared with the appropriate ministry audience.</p></header>
    <section className="rounded-xl border border-slate-200 bg-white p-5">
      <form className="grid gap-4 md:grid-cols-3" method="get">
        <label className="text-sm font-semibold">Search<input className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3" defaultValue={search ?? ""} maxLength={100} name="q" placeholder="Title, description, category" /></label>
        <label className="text-sm font-semibold">Category<select className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3" defaultValue={categoryId ?? ""} name="category"><option value="">All categories</option>{categories.map((item) => <option key={item.categoryId} value={item.categoryId}>{item.name}</option>)}</select></label>
        <label className="text-sm font-semibold">Type<select className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3" defaultValue={resourceType ?? ""} name="type"><option value="">All types</option>{types.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
        {canManage ? <label className="text-sm font-semibold">Audience<select className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3" defaultValue={audience ?? ""} name="audience"><option value="">All audiences</option>{audiences.map((item) => <option key={item} value={item}>{item.replaceAll("_", " ")}</option>)}</select></label> : null}
        {canManage ? <label className="text-sm font-semibold">Status<select className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3" defaultValue={status ?? ""} name="status"><option value="">All active</option>{statuses.map((item) => <option key={item} value={item}>{item}</option>)}</select></label> : null}
        <button className="min-h-11 self-end rounded-lg bg-slate-900 px-4 font-semibold text-white">Search resources</button>
      </form>
    </section>
    {canManage ? <section className="grid gap-6 lg:grid-cols-2">
      <div className="rounded-xl border border-slate-200 bg-white p-5"><h2 className="mb-4 text-xl font-bold">Create category</h2><CategoryCreateForm /></div>
      <div className="rounded-xl border border-slate-200 bg-white p-5"><h2 className="mb-4 text-xl font-bold">Create draft resource</h2><ResourceCreateForm categories={categories} /></div>
    </section> : null}
    {canManage ? <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-5"><h2 className="text-xl font-bold">Manage categories</h2>{categories.map((category) => <CategoryLifecycleForm category={category} key={category.categoryId} />)}{!categories.length ? <p className="text-slate-600">No active categories.</p> : null}</section> : null}
    <section className="space-y-4"><h2 className="text-2xl font-bold">Resources</h2><div className="grid gap-4 md:grid-cols-2">
      {resources.map((resource) => <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm" key={resource.resourceId}><div className="flex justify-between gap-3"><div><h3 className="text-xl font-bold">{resource.title}</h3><p className="mt-1 text-sm font-semibold text-sky-700">{resource.categoryName ?? "Uncategorized"} · {resource.resourceType}</p></div><span className="text-sm font-semibold text-slate-600">{resource.status}</span></div><p className="mt-3 text-slate-700">{resource.description ?? "No description recorded."}</p><p className="mt-3 text-sm text-slate-500">Audience: {resource.audience.replaceAll("_", " ")}{resource.versionNumber ? ` · Version ${resource.versionNumber}` : " · No file uploaded"}</p><ResourceFileControls canManage={canManage} resource={resource} versions={versionsByResource.get(resource.resourceId) ?? []} />{canManage ? <ResourceLifecycleForms resource={resource} /> : null}</article>)}
      {!resources.length ? <p className="rounded-xl border border-slate-200 bg-white p-6 text-slate-600">No visible resources match this search.</p> : null}
    </div></section>
  </div>;
}
