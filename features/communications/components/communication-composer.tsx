"use client";

import { useActionState } from "react";

import { sendSyntheticCommunicationAction } from "@/features/communications/actions/communication-actions";

import type {
  CommunicationActionState,
  CommunicationTemplate,
} from "@/features/communications/types/communications";

const initialState: CommunicationActionState = { success: false };
const field =
  "mt-1 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 py-2";

export function CommunicationComposer({
  audienceType,
  channel,
  templates,
}: Readonly<{
  audienceType: "parents" | "volunteers";
  channel: "in_app" | "email" | "sms";
  templates: CommunicationTemplate[];
}>) {
  const [state, action, pending] = useActionState(
    sendSyntheticCommunicationAction,
    initialState,
  );
  const compatibleTemplates = templates.filter(
    (template) => template.channel === channel && !template.archivedAt,
  );
  return (
    <form action={action} className="space-y-4">
      <input name="audienceType" type="hidden" value={audienceType} />
      <input name="channel" type="hidden" value={channel} />
      <label className="block text-sm font-semibold">Title
        <input className={field} maxLength={200} name="title" required />
      </label>
      <label className="block text-sm font-semibold">
        Template reference (optional)
        <select className={field} name="templateId">
          <option value="">No template</option>
          {compatibleTemplates.map((template) => (
            <option key={template.templateId} value={template.templateId}>
              {template.name}
            </option>
          ))}
        </select>
      </label>
      {channel === "email" ? (
        <label className="block text-sm font-semibold">Email subject
          <input className={field} maxLength={200} name="subject" required />
        </label>
      ) : <input name="subject" type="hidden" value="" />}
      <label className="block text-sm font-semibold">Message
        <textarea className={field} maxLength={10000} name="messageBody"
          required rows={6} />
      </label>
      <p className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm font-semibold text-amber-900">
        Test mode: this records a synthetic delivery. No email or SMS is sent.
      </p>
      {state.message ? (
        <p className={state.success ? "text-emerald-700" : "text-red-700"}>
          {state.message}
        </p>
      ) : null}
      <button className="min-h-11 rounded-lg bg-sky-700 px-5 font-semibold text-white"
        disabled={pending}>
        {pending ? "Recording…" : "Complete synthetic delivery"}
      </button>
    </form>
  );
}
