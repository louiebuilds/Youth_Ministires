"use client";

import { useActionState, useCallback, useEffect, useRef, useState } from "react";

import { sendSyntheticCommunicationAction } from "@/features/communications/actions/communication-actions";
import { resolveTemplateApplication } from "@/features/communications/components/communication-template-application.mjs";

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
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [subject, setSubject] = useState("");
  const [messageBody, setMessageBody] = useState("");
  const appliedContent = useRef<{ subject: string; messageBody: string } | null>(
    null,
  );
  const templateSelect = useRef<HTMLSelectElement>(null);
  const compatibleTemplates = templates.filter(
    (template) => template.channel === channel && !template.archivedAt,
  );

  const selectTemplate = useCallback((templateId: string) => {
    const input = {
      templates: compatibleTemplates,
      templateId,
      channel,
      subject,
      messageBody,
      appliedContent: appliedContent.current,
    };
    let result = resolveTemplateApplication(input);
    if (result.kind === "confirmation_required") {
      if (window.confirm(
        "Apply this template and replace the message content you entered?",
      )) {
        result = resolveTemplateApplication({
          ...input,
          allowManualReplacement: true,
        });
      } else {
        if (templateSelect.current) {
          templateSelect.current.value = selectedTemplateId;
        }
        return;
      }
    }
    if (result.kind !== "applied") {
      if (templateSelect.current) {
        templateSelect.current.value = selectedTemplateId;
      }
      return;
    }
    setSelectedTemplateId(result.selectedTemplateId);
    setMessageBody(result.messageBody);
    setSubject(result.subject);
    appliedContent.current = result.appliedContent;
  }, [channel, compatibleTemplates, messageBody, selectedTemplateId, subject]);

  useEffect(() => {
    const reconcileRestoredSelection = () => {
      const restoredTemplateId = templateSelect.current?.value ?? "";
      if (restoredTemplateId && restoredTemplateId !== selectedTemplateId) {
        selectTemplate(restoredTemplateId);
      }
    };
    reconcileRestoredSelection();
    window.addEventListener("pageshow", reconcileRestoredSelection);
    return () => window.removeEventListener("pageshow", reconcileRestoredSelection);
  }, [selectTemplate, selectedTemplateId]);

  return (
    <form action={action} className="space-y-4">
      <input name="audienceType" type="hidden" value={audienceType} />
      <input name="channel" type="hidden" value={channel} />
      <label className="block text-sm font-semibold">Title
        <input className={field} maxLength={200} name="title" required />
      </label>
      <label className="block text-sm font-semibold" htmlFor="compose-template">
        Template reference (optional)
        <select className={field} id="compose-template" name="templateId"
          onChange={(event) => selectTemplate(event.target.value)}
          ref={templateSelect}
          value={selectedTemplateId}>
          <option value="">No template</option>
          {compatibleTemplates.map((template) => (
            <option key={template.templateId} value={template.templateId}>
              {template.name}
            </option>
          ))}
        </select>
      </label>
      {channel === "email" ? (
        <label className="block text-sm font-semibold" htmlFor="compose-subject">Email subject
          <input className={field} id="compose-subject" maxLength={200}
            name="subject" onChange={(event) => setSubject(event.target.value)}
            required value={subject} />
        </label>
      ) : <input name="subject" type="hidden" value="" />}
      <label className="block text-sm font-semibold" htmlFor="compose-message">Message
        <textarea className={field} id="compose-message" maxLength={10000}
          name="messageBody"
          onChange={(event) => setMessageBody(event.target.value)}
          required rows={6} value={messageBody} />
      </label>
      <p className="text-sm text-slate-600">
        Template content is copied into these fields and can be edited before delivery.
      </p>
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
