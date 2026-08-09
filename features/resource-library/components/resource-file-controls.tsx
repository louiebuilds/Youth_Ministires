"use client";

import { useState } from "react";

import { downloadLibraryResourceAction, finalizeLibraryResourceUploadAction, prepareLibraryResourceUploadAction } from "@/features/resource-library/actions/resource-library-actions";
import { createClient } from "@/lib/supabase/client";
import type { LibraryResource, LibraryResourceVersion } from "@/features/resource-library/types/resource-library";

const field = "mt-1 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm";
const acceptByType = { document: ".pdf,.docx,.pptx,.xlsx,.txt", image: ".jpg,.jpeg,.png,.webp", video: ".mp4", other: ".pdf,.txt" } as const;

export function ResourceFileControls({ canManage, resource, versions }: Readonly<{ canManage: boolean; resource: LibraryResource; versions: LibraryResourceVersion[] }>) {
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);

  async function upload(formData: FormData) {
    const file = formData.get("file");
    if (!(file instanceof File) || !file.size) return setMessage("Select a synthetic file.");
    setPending(true); setMessage("");
    const input = { resourceId: resource.resourceId, resourceType: resource.resourceType, originalFileName: file.name, contentType: file.type, fileSizeBytes: file.size, changeSummary: String(formData.get("changeSummary") ?? "") };
    const prepared = await prepareLibraryResourceUploadAction(input);
    if (!prepared.success) { setMessage(prepared.message); setPending(false); return; }
    const uploaded = await createClient().storage.from("resource-library").uploadToSignedUrl(prepared.storageObjectPath, prepared.token, file, { contentType: file.type });
    if (uploaded.error) { setMessage("The private file upload failed."); setPending(false); return; }
    const finalized = await finalizeLibraryResourceUploadAction({ ...input, versionId: prepared.versionId, storageObjectPath: prepared.storageObjectPath });
    setMessage(finalized.message); setPending(false);
  }

  return <div className="mt-4 space-y-4 border-t border-slate-200 pt-4">
    {resource.currentVersionId ? <form action={downloadLibraryResourceAction}><input type="hidden" name="resourceId" value={resource.resourceId} /><input type="hidden" name="versionId" value="" /><button className="font-semibold text-sky-700 underline">Download {resource.originalFileName ?? "current file"}</button></form> : null}
    {canManage ? <form action={upload} className="grid gap-3 md:grid-cols-2"><label className="text-sm font-semibold">{resource.currentVersionId ? "Replacement file" : "Initial file"}<input accept={acceptByType[resource.resourceType]} className={field} name="file" required type="file" /></label><label className="text-sm font-semibold">Version note<input className={field} name="changeSummary" maxLength={1000} placeholder="Synthetic initial upload or change" /></label><div className="md:col-span-2"><button className="min-h-11 rounded-lg bg-slate-900 px-4 font-semibold text-white disabled:opacity-60" disabled={pending}>{pending ? "Uploading…" : resource.currentVersionId ? "Upload replacement version" : "Upload initial file"}</button>{message ? <p className="mt-2 text-sm font-semibold">{message}</p> : null}</div></form> : null}
    {canManage && versions.length ? <div><h4 className="font-semibold">Version history</h4><ul className="mt-2 space-y-2">{versions.map((version) => <li className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-slate-50 p-3 text-sm" key={version.versionId}><span>Version {version.versionNumber}{version.isCurrent ? " · current" : ""} · {version.originalFileName}{version.changeSummary ? ` · ${version.changeSummary}` : ""}</span><form action={downloadLibraryResourceAction}><input type="hidden" name="resourceId" value={resource.resourceId} /><input type="hidden" name="versionId" value={version.versionId} /><button className="font-semibold text-sky-700 underline">Download version</button></form></li>)}</ul></div> : null}
  </div>;
}
