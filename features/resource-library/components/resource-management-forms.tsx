"use client";

import { useActionState } from "react";

import { archiveCategoryAction, archiveResourceAction, createResourceAction, publishResourceAction, saveCategoryAction } from "@/features/resource-library/actions/resource-library-actions";
import type { LibraryResource, ResourceCategory, ResourceLibraryActionState } from "@/features/resource-library/types/resource-library";

const initial: ResourceLibraryActionState = { success: false };
const field = "mt-1 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 py-2";

export function CategoryCreateForm() {
  const [state, action, pending] = useActionState(saveCategoryAction, initial);
  return <form action={action} className="grid gap-3 md:grid-cols-2">
    <label className="text-sm font-semibold">Category name<input className={field} name="name" maxLength={100} required /></label>
    <label className="text-sm font-semibold">Description<input className={field} name="description" maxLength={1000} /></label>
    {state.message ? <p className={state.success ? "text-emerald-700" : "text-red-700"}>{state.message}</p> : null}
    <button className="min-h-11 rounded-lg bg-sky-700 px-4 font-semibold text-white md:col-span-2" disabled={pending}>{pending ? "Creating…" : "Create category"}</button>
  </form>;
}

export function CategoryLifecycleForm({ category }: Readonly<{ category: ResourceCategory }>) {
  const [saveState, saveAction, saving] = useActionState(saveCategoryAction, initial);
  const [archiveState, archiveAction, archiving] = useActionState(archiveCategoryAction, initial);
  return <div className="grid gap-2 md:grid-cols-[1fr_1fr_auto_auto]">
    <form action={saveAction} className="contents"><input type="hidden" name="categoryId" value={category.categoryId} /><input aria-label="Category name" className={field} name="name" defaultValue={category.name} required /><input aria-label="Category description" className={field} name="description" defaultValue={category.description ?? ""} /><button className="min-h-11 self-end rounded-lg border border-sky-700 px-3 font-semibold text-sky-800" disabled={saving}>Save</button></form>
    <form action={archiveAction} className="self-end"><input type="hidden" name="categoryId" value={category.categoryId} /><button className="min-h-11 rounded-lg border border-red-300 px-3 font-semibold text-red-800" disabled={archiving}>Archive</button></form>
    {[saveState.message, archiveState.message].filter(Boolean).map((message) => <p className="text-sm md:col-span-4" key={message}>{message}</p>)}
  </div>;
}

export function ResourceCreateForm({ categories }: Readonly<{ categories: ResourceCategory[] }>) {
  const [state, action, pending] = useActionState(createResourceAction, initial);
  return <form action={action} className="grid gap-4 md:grid-cols-2">
    <label className="text-sm font-semibold md:col-span-2">Title<input className={field} name="title" maxLength={200} required /></label>
    <label className="text-sm font-semibold md:col-span-2">Description<textarea className={field} name="description" rows={3} maxLength={4000} /></label>
    <label className="text-sm font-semibold">Category<select className={field} name="categoryId" defaultValue=""><option value="">Uncategorized</option>{categories.map((item) => <option key={item.categoryId} value={item.categoryId}>{item.name}</option>)}</select></label>
    <label className="text-sm font-semibold">Type<select className={field} name="resourceType" defaultValue="document"><option value="document">Document</option><option value="image">Image</option><option value="video">Video</option><option value="other">Other</option></select></label>
    <label className="text-sm font-semibold md:col-span-2">Audience<select className={field} name="audience" defaultValue="ministry"><option value="ministry">Ministry team only</option><option value="volunteer">Volunteers</option><option value="family">Families</option><option value="all_authenticated">All signed-in accounts</option></select></label>
    {state.message ? <p className={state.success ? "text-emerald-700 md:col-span-2" : "text-red-700 md:col-span-2"}>{state.message}</p> : null}
    <button className="min-h-11 rounded-lg bg-sky-700 px-5 font-semibold text-white md:col-span-2" disabled={pending}>{pending ? "Creating…" : "Create draft resource"}</button>
  </form>;
}

export function ResourceLifecycleForms({ resource }: Readonly<{ resource: LibraryResource }>) {
  const [publishState, publishAction, publishing] = useActionState(publishResourceAction, initial);
  const [archiveState, archiveAction, archiving] = useActionState(archiveResourceAction, initial);
  return <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-slate-200 pt-4">
    {resource.status === "draft" ? <form action={publishAction}><input type="hidden" name="resourceId" value={resource.resourceId} /><button className="min-h-11 rounded-lg bg-emerald-700 px-4 font-semibold text-white" disabled={publishing}>Publish</button></form> : null}
    {resource.status !== "archived" ? <form action={archiveAction}><input type="hidden" name="resourceId" value={resource.resourceId} /><button className="min-h-11 rounded-lg border border-red-300 px-4 font-semibold text-red-800" disabled={archiving}>Archive</button></form> : null}
    {[publishState.message, archiveState.message].filter(Boolean).map((message) => <p className="text-sm" key={message}>{message}</p>)}
  </div>;
}
