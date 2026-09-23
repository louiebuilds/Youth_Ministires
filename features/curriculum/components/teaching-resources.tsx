"use client";

import { useActionState, useState } from "react";

import {
  archiveTeachingResourceAction,
  createTeachingResourceLinkAction,
  downloadTeachingResourceAction,
  finalizeTeachingResourceUploadAction,
  prepareTeachingResourceUploadAction,
} from "@/features/curriculum/actions/curriculum-actions";
import { classifyTeachingResourceFile } from "@/features/curriculum/utils/teaching-resource-file-classification.mjs";
import { nextTeachingResourcePanel } from "@/features/curriculum/utils/teaching-resource-panel-state.mjs";
import { createClient } from "@/lib/supabase/client";

import type {
  CurriculumActionState,
  TeachingResource,
} from "@/features/curriculum/types/curriculum";

const initialState: CurriculumActionState = { success: false };
const inputClass =
  "mt-1 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm";

function ResourceCard({
  canManage,
  lessonId,
  resource,
}: Readonly<{
  canManage: boolean;
  lessonId: string;
  resource: TeachingResource;
}>) {
  const [state, action, pending] = useActionState(
    archiveTeachingResourceAction,
    initialState,
  );
  return (
    <li className="rounded-lg border border-slate-200 p-4">
      <div className="flex flex-wrap justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-sky-700">
            {resource.resourceType}
          </p>
          <h3 className="font-bold">{resource.title}</h3>
          {resource.description ? (
            <p className="mt-1 text-sm text-slate-600">{resource.description}</p>
          ) : null}
          {resource.externalUrl ? (
            <a className="mt-3 inline-block font-semibold text-sky-700 underline"
              href={resource.externalUrl} rel="noreferrer"
              target="_blank">Open resource</a>
          ) : null}
          {resource.hasFile ? (
            <form action={downloadTeachingResourceAction} className="mt-3">
              <input name="teachingResourceId" type="hidden"
                value={resource.teachingResourceId} />
              <button className="font-semibold text-sky-700 underline">
                Download {resource.originalFileName || "file"}
              </button>
            </form>
          ) : null}
        </div>
        {canManage ? (
          <form action={action}>
            <input name="lessonId" type="hidden" value={lessonId} />
            <input name="teachingResourceId" type="hidden"
              value={resource.teachingResourceId} />
            <button className="min-h-11 rounded-lg border border-red-300 px-3 font-semibold text-red-800"
              disabled={pending}>Archive</button>
          </form>
        ) : null}
      </div>
      {state.message ? (
        <p className={`mt-3 text-sm font-semibold ${
          state.success ? "text-emerald-700" : "text-red-700"
        }`}>{state.message}</p>
      ) : null}
    </li>
  );
}

function TeachingResourceUpload({
  lessonId,
}: Readonly<{ lessonId: string }>) {
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  const [fileTypeLabel, setFileTypeLabel] = useState<string | null>(null);

  async function upload(formData: FormData) {
    const file = formData.get("file");
    if (!(file instanceof File) || !file.size) {
      setMessage("Select a file.");
      return;
    }
    const classification = classifyTeachingResourceFile(file.name, file.type);
    if (!classification) {
      setMessage(
        "Choose a supported PDF, Word, PowerPoint, text, or MP4 file whose format matches its file extension.",
      );
      return;
    }
    setPending(true);
    setMessage("");
    const input = {
      lessonId,
      title: String(formData.get("title") ?? ""),
      resourceType: classification.resourceType,
      description: String(formData.get("description") ?? ""),
      originalFileName: file.name,
      contentType: classification.contentType,
      fileSizeBytes: file.size,
    };
    const prepared = await prepareTeachingResourceUploadAction(input);
    if (!prepared.success) {
      setMessage(prepared.message);
      setPending(false);
      return;
    }
    const supabase = createClient();
    const uploaded = await supabase.storage.from("curriculum-files")
      .uploadToSignedUrl(
        prepared.storageObjectPath,
        prepared.token,
        file,
        { contentType: file.type },
      );
    if (uploaded.error) {
      setMessage("The private file upload failed.");
      setPending(false);
      return;
    }
    const finalized = await finalizeTeachingResourceUploadAction({
      ...input,
      teachingResourceId: prepared.teachingResourceId,
      storageObjectPath: prepared.storageObjectPath,
    });
    if (!finalized.success) {
      await supabase.storage.from("curriculum-files")
        .remove([prepared.storageObjectPath]);
    }
    setMessage(finalized.message);
    setPending(false);
  }

  return (
    <form action={upload} className="grid gap-4 border-t border-slate-200 pt-5 md:grid-cols-2">
      <h3 className="text-lg font-bold md:col-span-2">Upload private file</h3>
      <label className="text-sm font-semibold">Title
        <input className={inputClass} maxLength={200} name="title" required />
      </label>
      <label className="text-sm font-semibold md:col-span-2">File
        <input accept=".pdf,.docx,.pptx,.txt,.mp4"
          className={inputClass} name="file" onChange={(event) => {
            const file = event.currentTarget.files?.[0];
            const classification = file
              ? classifyTeachingResourceFile(file.name, file.type)
              : null;
            setFileTypeLabel(classification?.label ?? null);
            setMessage(file && !classification
              ? "Choose a supported file whose format matches its file extension."
              : "");
          }} required type="file" />
      </label>
      <p className="text-sm text-slate-600 md:col-span-2" aria-live="polite">
        {fileTypeLabel
          ? `Detected file type: ${fileTypeLabel}.`
          : "Supported files: PDF, DOCX, PPTX, TXT, and MP4."}
      </p>
      <label className="text-sm font-semibold md:col-span-2">Description
        <textarea className={inputClass} maxLength={2000}
          name="description" rows={2} />
      </label>
      <div className="md:col-span-2">
        <button className="min-h-11 rounded-lg bg-slate-900 px-4 font-semibold text-white disabled:opacity-60"
          disabled={pending}>
          {pending ? "Uploading…" : "Upload private file"}
        </button>
        {message ? <p className="mt-3 text-sm font-semibold">{message}</p> : null}
      </div>
    </form>
  );
}

export function TeachingResources({
  canManage,
  lessonId,
  resources,
}: Readonly<{
  canManage: boolean;
  lessonId: string;
  resources: TeachingResource[];
}>) {
  const [state, action, pending] = useActionState(
    createTeachingResourceLinkAction,
    initialState,
  );
  const [activePanel, setActivePanel] = useState<"link" | "upload" | null>(null);
  return (
    <section className="space-y-5 rounded-xl border border-slate-200 bg-white p-5">
      <div>
        <p className="text-sm font-semibold text-sky-700">Lesson materials</p>
        <h2 className="mt-1 text-xl font-bold">Teaching resources</h2>
      </div>
      {canManage ? (
        <div className="space-y-5">
          <div className="flex flex-wrap gap-3">
            <button aria-expanded={activePanel === "link"}
              className="min-h-11 rounded-lg bg-sky-700 px-4 font-semibold text-white"
              onClick={() => setActivePanel((current) =>
                nextTeachingResourcePanel(current, "link"))} type="button">
              Add resource
            </button>
            <button aria-expanded={activePanel === "upload"}
              className="min-h-11 rounded-lg border border-slate-300 bg-white px-4 font-semibold text-slate-800"
              onClick={() => setActivePanel((current) =>
                nextTeachingResourcePanel(current, "upload"))} type="button">
              Upload private file
            </button>
          </div>
        {activePanel === "link" ? <form action={action}
          className="grid gap-4 rounded-xl border border-slate-200 bg-slate-50 p-5 md:grid-cols-2">
          <div className="flex items-center justify-between gap-3 md:col-span-2">
            <h3 className="text-lg font-bold">Add resource link</h3>
            <button className="min-h-11 px-3 font-semibold text-slate-700"
              onClick={() => setActivePanel(null)} type="button">Cancel</button>
          </div>
          <input name="lessonId" type="hidden" value={lessonId} />
          <label className="text-sm font-semibold">Title
            <input className={inputClass} maxLength={200} name="title" required />
          </label>
          <label className="text-sm font-semibold">Type
            <select className={inputClass} name="resourceType">
              <option value="video">Video</option>
              <option value="link">Link</option>
              <option value="other">Other</option>
            </select>
          </label>
          <label className="text-sm font-semibold md:col-span-2">HTTPS URL
            <input className={inputClass} maxLength={2000}
              name="externalUrl" required type="url" />
          </label>
          <label className="text-sm font-semibold md:col-span-2">Description
            <textarea className={inputClass} maxLength={2000}
              name="description" rows={2} />
          </label>
          <div className="md:col-span-2">
            <button className="min-h-11 rounded-lg bg-sky-700 px-4 font-semibold text-white"
              disabled={pending}>Add resource link</button>
            {state.message ? (
              <p className={`mt-3 text-sm font-semibold ${
                state.success ? "text-emerald-700" : "text-red-700"
              }`}>{state.message}</p>
            ) : null}
          </div>
        </form> : null}
        {activePanel === "upload" ? <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
          <div className="mb-2 flex justify-end">
            <button className="min-h-11 px-3 font-semibold text-slate-700"
              onClick={() => setActivePanel(null)} type="button">Cancel</button>
          </div>
          <TeachingResourceUpload lessonId={lessonId} />
        </div> : null}
        </div>
      ) : null}
      <ul className="grid gap-3 md:grid-cols-2">
        {resources.map((resource) => (
          <ResourceCard canManage={canManage} key={resource.teachingResourceId}
            lessonId={lessonId} resource={resource} />
        ))}
      </ul>
      {!resources.length ? (
        <p className="text-sm text-slate-600">No teaching resources added.</p>
      ) : null}
    </section>
  );
}
