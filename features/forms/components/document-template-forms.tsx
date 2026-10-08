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

const initialState: DocumentTemplateActionState = {
  success: false,
};

const inputClass =
  "mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3";

function Message({
  state,
}: Readonly<{ state: DocumentTemplateActionState }>) {
  return state.message ? (
    <p
      className={`text-sm ${
        state.success
          ? "text-emerald-700"
          : "text-rose-700"
      }`}
    >
      {state.message}
    </p>
  ) : null;
}

export function CreateDocumentTemplateForm() {
  const [state, action, pending] = useActionState(
    createDocumentTemplateAction,
    initialState,
  );

  return (
    <form
      action={action}
      className="grid gap-4 md:grid-cols-2"
    >
      <label className="text-sm font-semibold">
        Template name
        <input
          className={inputClass}
          maxLength={200}
          name="name"
          required
        />
      </label>

      <label className="text-sm font-semibold">
        Document type
        <select
          className={inputClass}
          name="documentKind"
        >
          <option value="permission_slip">
            Waiver / Permission Form
          </option>

          <option value="medical_release">
            Medical release
          </option>
        </select>
      </label>

      <label className="text-sm font-semibold md:col-span-2">
        Description
        <textarea
          className={`${inputClass} py-2`}
          maxLength={2000}
          name="description"
        />
      </label>

      <Message state={state} />

      <button
        className="min-h-11 rounded-lg bg-sky-700 px-4 font-semibold text-white"
        disabled={pending}
      >
        {pending ? "Creating…" : "Create template"}
      </button>
    </form>
  );
}

export function VersionDraftForm({
  templateId,
  version,
}: Readonly<{
  templateId: string;
  version?: DocumentTemplateVersionSummary;
}>) {
  const [state, action, pending] = useActionState(
    saveDocumentTemplateVersionAction,
    initialState,
  );

  return (
    <form
      action={action}
      className="grid gap-3 md:grid-cols-3"
    >
      <input
        name="templateId"
        type="hidden"
        value={templateId}
      />

      <input
        name="versionId"
        type="hidden"
        value={version?.versionId ?? ""}
      />

      <label className="text-sm font-semibold">
        Validity policy
        <select
          className={inputClass}
          defaultValue={
            version?.validityPolicy ??
            "event_specific"
          }
          name="validityPolicy"
        >
          <option value="event_specific">
            Event specific
          </option>

          <option value="fixed_interval">
            Fixed interval
          </option>

          <option value="explicit_expiration">
            Explicit expiration
          </option>
        </select>
      </label>

      <label className="text-sm font-semibold">
        Valid for (PostgreSQL interval)
        <input
          className={inputClass}
          defaultValue={version?.validFor ?? ""}
          name="validFor"
          placeholder="1 year"
        />
      </label>

      <label className="text-sm font-semibold">
        Explicit expiration
        <input
          className={inputClass}
          defaultValue={
            version?.explicitExpiresOn ?? ""
          }
          name="explicitExpiresOn"
          type="date"
        />
      </label>

      <label className="text-sm font-semibold">
        Effective from
        <input
          className={inputClass}
          defaultValue={
            version?.effectiveFrom ?? ""
          }
          name="effectiveFrom"
          type="date"
        />
      </label>

      <label className="text-sm font-semibold">
        Effective through
        <input
          className={inputClass}
          defaultValue={
            version?.effectiveTo ?? ""
          }
          name="effectiveTo"
          type="date"
        />
      </label>

      <div className="self-end">
        <Message state={state} />

        <button
          className="min-h-11 w-full rounded-lg border border-sky-700 px-4 font-semibold text-sky-800"
          disabled={pending}
        >
          {pending
            ? "Saving…"
            : version
              ? "Save draft"
              : "Create draft version"}
        </button>
      </div>
    </form>
  );
}

export function BlankMasterUpload({
  versionId,
}: Readonly<{ versionId: string }>) {
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);

  async function upload(formData: FormData) {
    const file = formData.get("file");

    if (
      !(file instanceof File) ||
      file.type !== "application/pdf" ||
      file.size < 1 ||
      file.size > 15 * 1024 * 1024
    ) {
      setMessage(
        "Choose a PDF no larger than 15 MB.",
      );
      return;
    }

    setPending(true);
    setMessage("");

    try {
      const authorization =
        await prepareBlankMasterUploadAction(
          versionId,
        );

      const client = createClient();

      const uploaded = await client.storage
        .from(authorization.bucket)
        .uploadToSignedUrl(
          authorization.objectPath,
          authorization.token,
          file,
          {
            contentType: "application/pdf",
          },
        );

      if (uploaded.error) {
        throw new Error(uploaded.error.message);
      }

      await finalizeBlankMasterUploadAction(
        versionId,
        file.name,
      );

      setMessage(
        "Blank master uploaded and verified.",
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "The blank master could not be uploaded.",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <form action={upload} className="space-y-2">
      <input
        accept="application/pdf,.pdf"
        name="file"
        required
        type="file"
      />

      <button
        className="min-h-11 rounded-lg bg-sky-700 px-4 font-semibold text-white"
        disabled={pending}
      >
        {pending
          ? "Uploading…"
          : "Upload blank PDF"}
      </button>

      {message ? (
        <p className="text-sm text-slate-700">
          {message}
        </p>
      ) : null}
    </form>
  );
}

export function VersionLifecycleForm({
  versionId,
  mode,
}: Readonly<{
  versionId: string;
  mode: "publish" | "retire";
}>) {
  const action =
    mode === "publish"
      ? publishDocumentTemplateVersionAction
      : retireDocumentTemplateVersionAction;

  const [state, formAction, pending] =
    useActionState(action, initialState);

  return (
    <form
      action={formAction}
      className="space-y-1"
    >
      <input
        name="versionId"
        type="hidden"
        value={versionId}
      />

      <button
        className="min-h-11 rounded-lg border px-4 font-semibold capitalize"
        disabled={pending}
      >
        {pending ? "Saving…" : mode}
      </button>

      <Message state={state} />
    </form>
  );
}

export function ArchiveTemplateForm({
  templateId,
}: Readonly<{ templateId: string }>) {
  const [state, action, pending] = useActionState(
    archiveDocumentTemplateAction,
    initialState,
  );

  return (
    <form action={action} className="space-y-1">
      <input
        name="templateId"
        type="hidden"
        value={templateId}
      />

      <button
        className="min-h-11 rounded-lg border border-rose-300 px-4 font-semibold text-rose-800"
        disabled={pending}
      >
        {pending
          ? "Archiving…"
          : "Archive template"}
      </button>

      <Message state={state} />
    </form>
  );
}