"use client";

import { useActionState, useState } from "react";
import { createClient } from "@/lib/supabase/client";

import {
  archiveDocumentTemplateAction,
  createDocumentTemplateAction,
  finalizeBlankMasterUploadAction,
  prepareBlankMasterUploadAction,
  publishDocumentTemplateVersionAction,
  retireDocumentTemplateVersionAction,
  saveDocumentTemplateVersionAction,
} from "@/features/forms/actions/document-template-actions";
import type {
  DocumentTemplateActionState,
  DocumentTemplateVersionSummary,
} from "@/features/forms/types/document-templates";

const initialState: DocumentTemplateActionState = { success: false };
const inputClass = "mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3";

function Message({ state }: Readonly<{ state: DocumentTemplateActionState }>) {
  return state.message ? (
    <p className={`text-sm ${state.success ? "text-emerald-700" : "text-rose-700"}`}>
      {state.message}
    </p>
  ) : null;
}

export function CreateDocumentTemplateForm() {
  const [state, action, pending] = useActionState(createDocumentTemplateAction, initialState);
  return (
    <form action={action} className="grid gap-4 md:grid-cols-2">
      <label className="text-sm font-semibold">
        Template name
        <input className={inputClass} name="name" required maxLength={200} />
      </label>
      <label className="text-sm font-semibold">
        Document type
        <select className={inputClass} name="documentKind">
          <option value="permission_slip">Permission slip</option>
          <option value="medical_release">Medical release</option>
        </select>
      </label>
      <label className="text-sm font-semibold md:col-span-2">
        Description
        <textarea className={`${inputClass} py-2`} name="description" maxLength={2000} />
      </label>
      <Message state={state} />
      <button disabled={pending} className="min-h-11 rounded-lg bg-sky-700 px-4 font-semibold text-white">
        {pending ? "Creating…" : "Create template"}
      </button>
    </form>
  );
}

export function VersionDraftForm({
  templateId,
  version,
}: Readonly<{ templateId: string; version?: DocumentTemplateVersionSummary }>) {
  const [state, action, pending] = useActionState(saveDocumentTemplateVersionAction, initialState);
  return (
    <form action={action} className="grid gap-3 md:grid-cols-3">
      <input type="hidden" name="templateId" value={templateId} />
      <input type="hidden" name="versionId" value={version?.versionId ?? ""} />
      <label className="text-sm font-semibold">
        Validity policy
        <select className={inputClass} name="validityPolicy" defaultValue={version?.validityPolicy ?? "event_specific"}>
          <option value="event_specific">Event specific</option>
          <option value="fixed_interval">Fixed interval</option>
          <option value="explicit_expiration">Explicit expiration</option>
        </select>
      </label>
      <label className="text-sm font-semibold">
        Valid for (PostgreSQL interval)
        <input className={inputClass} name="validFor" placeholder="1 year" defaultValue={version?.validFor ?? ""} />
      </label>
      <label className="text-sm font-semibold">
        Explicit expiration
        <input className={inputClass} name="explicitExpiresOn" type="date" defaultValue={version?.explicitExpiresOn ?? ""} />
      </label>
      <label className="text-sm font-semibold">
        Effective from
        <input className={inputClass} name="effectiveFrom" type="date" defaultValue={version?.effectiveFrom ?? ""} />
      </label>
      <label className="text-sm font-semibold">
        Effective through
        <input className={inputClass} name="effectiveTo" type="date" defaultValue={version?.effectiveTo ?? ""} />
      </label>
      <div className="self-end">
        <Message state={state} />
        <button disabled={pending} className="min-h-11 w-full rounded-lg border border-sky-700 px-4 font-semibold text-sky-800">
          {pending ? "Saving…" : version ? "Save draft" : "Create draft version"}
        </button>
      </div>
    </form>
  );
}

export function BlankMasterUpload({ versionId }: Readonly<{ versionId: string }>) {
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);

  async function upload(formData: FormData) {
    const file = formData.get("file");
    if (!(file instanceof File) || file.type !== "application/pdf" || file.size < 1 || file.size > 15 * 1024 * 1024) {
      setMessage("Choose a PDF no larger than 15 MB.");
      return;
    }
    setPending(true);
    setMessage("");
    try {
      const authorization = await prepareBlankMasterUploadAction(versionId);
      const client = createClient();
      const uploaded = await client.storage
        .from(authorization.bucket)
        .uploadToSignedUrl(authorization.objectPath, authorization.token, file, {
          contentType: "application/pdf",
        });
      if (uploaded.error) throw new Error(uploaded.error.message);
      await finalizeBlankMasterUploadAction(versionId, file.name);
      setMessage("Blank master uploaded and verified.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "The blank master could not be uploaded.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form action={upload} className="space-y-2">
      <input name="file" type="file" accept="application/pdf,.pdf" required />
      <button disabled={pending} className="min-h-11 rounded-lg bg-sky-700 px-4 font-semibold text-white">
        {pending ? "Uploading…" : "Upload blank PDF"}
      </button>
      {message ? <p className="text-sm text-slate-700">{message}</p> : null}
    </form>
  );
}

export function VersionLifecycleForm({
  versionId,
  mode,
}: Readonly<{ versionId: string; mode: "publish" | "retire" }>) {
  const action = mode === "publish" ? publishDocumentTemplateVersionAction : retireDocumentTemplateVersionAction;
  const [state, formAction, pending] = useActionState(action, initialState);
  return (
    <form action={formAction} className="space-y-1">
      <input type="hidden" name="versionId" value={versionId} />
      <button disabled={pending} className="min-h-11 rounded-lg border px-4 font-semibold capitalize">
        {pending ? "Saving…" : mode}
      </button>
      <Message state={state} />
    </form>
  );
}

export function ArchiveTemplateForm({ templateId }: Readonly<{ templateId: string }>) {
  const [state, action, pending] = useActionState(archiveDocumentTemplateAction, initialState);
  return (
    <form action={action} className="space-y-1">
      <input type="hidden" name="templateId" value={templateId} />
      <button disabled={pending} className="min-h-11 rounded-lg border border-rose-300 px-4 font-semibold text-rose-800">
        {pending ? "Archiving…" : "Archive template"}
      </button>
      <Message state={state} />
    </form>
  );
}
