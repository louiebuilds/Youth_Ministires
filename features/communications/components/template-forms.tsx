"use client";

import { useActionState, useState } from "react";

import {
  archiveCommunicationTemplateAction,
  saveCommunicationTemplateAction,
} from "@/features/communications/actions/communication-actions";

import type {
  CommunicationActionState,
  CommunicationTemplate,
} from "@/features/communications/types/communications";

const initialState: CommunicationActionState = { success: false };
const field =
  "mt-1 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 py-2";

export function CommunicationTemplateForm({
  template,
}: Readonly<{ template?: CommunicationTemplate }>) {
  const [channel, setChannel] = useState(template?.channel ?? "in_app");
  const [state, action, pending] = useActionState(
    saveCommunicationTemplateAction,
    initialState,
  );
  return (
    <form action={action} className="space-y-4">
      {template ? (
        <input name="templateId" type="hidden" value={template.templateId} />
      ) : null}
      <div className="grid gap-4 md:grid-cols-2">
        <label className="text-sm font-semibold" htmlFor="template-name">Template name
          <input className={field} defaultValue={template?.name ?? ""}
            id="template-name"
            maxLength={150} name="name" required />
        </label>
        <label className="text-sm font-semibold" htmlFor="template-channel">Channel
          <select className={field} defaultValue={template?.channel ?? "in_app"}
            id="template-channel" name="channel"
            onChange={(event) => setChannel(
              event.target.value as CommunicationTemplate["channel"],
            )}>
            <option value="in_app">In-app</option>
            <option value="email">Email</option>
            <option value="sms">SMS</option>
          </select>
        </label>
      </div>
      {channel === "email" ? (
        <label className="block text-sm font-semibold" htmlFor="template-subject">
          Email subject
          <input className={field} defaultValue={template?.subject ?? ""}
            id="template-subject" maxLength={200} name="subject" required />
        </label>
      ) : (
        <input name="subject" type="hidden" value="" />
      )}
      <label className="block text-sm font-semibold" htmlFor="template-message">Message
        <textarea className={field} defaultValue={template?.messageBody ?? ""}
          id="template-message" maxLength={10000} name="messageBody" required rows={5} />
      </label>
      {state.message ? (
        <p className={state.success ? "text-emerald-700" : "text-red-700"}>
          {state.message}
        </p>
      ) : null}
      <button className="min-h-11 rounded-lg bg-sky-700 px-5 font-semibold text-white"
        disabled={pending}>
        {pending ? "Saving…" : template ? "Save template" : "Create template"}
      </button>
    </form>
  );
}

export function ArchiveCommunicationTemplateForm({
  templateId,
}: Readonly<{ templateId: string }>) {
  const [state, action, pending] = useActionState(
    archiveCommunicationTemplateAction,
    initialState,
  );
  return (
    <form action={action} className="mt-4 flex flex-wrap items-center gap-3">
      <input name="templateId" type="hidden" value={templateId} />
      <button className="min-h-11 rounded-lg border border-red-300 px-4 font-semibold text-red-800"
        disabled={pending}>Archive template</button>
      {state.message ? <p className="text-sm">{state.message}</p> : null}
    </form>
  );
}
