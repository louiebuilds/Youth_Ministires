"use client";

import { useActionState, useCallback, useEffect, useRef, useState } from "react";

import { sendCommunicationAction } from "@/features/communications/actions/communication-actions";
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
  emailMode,
  liveSendCount,
  suppressedCount,
  liveDisabledReason,
  idempotencyKey,
}: Readonly<{
  audienceType: "parents" | "volunteers";
  channel: "in_app" | "email" | "sms";
  templates: CommunicationTemplate[];
  emailMode: "synthetic" | "live" | "disabled";
  liveSendCount: number;
  suppressedCount: number;
  liveDisabledReason: string | null;
  idempotencyKey: string;
}>) {
  const [state, action, pending] = useActionState(
    sendCommunicationAction,
    initialState,
  );
  const [reviewingLiveSend, setReviewingLiveSend] = useState(false);
  const [liveConfirmed, setLiveConfirmed] = useState(false);
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
  const isLiveEmail = channel === "email" && emailMode === "live";
  const isDisabledLiveEmail = channel === "email" && emailMode === "disabled";

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
      <input name="idempotencyKey" type="hidden" value={idempotencyKey} />
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
      {isLiveEmail ? (
        <div className="rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-950">
          <p className="font-bold">Live Email · beta allowlist only</p>
          <p className="mt-1">Channel: Email · Audience: {audienceType}</p>
          <p className="mt-1">{liveSendCount} allowlisted live recipient{liveSendCount === 1 ? "" : "s"} · {suppressedCount} suppressed</p>
        </div>
      ) : (
        <p className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm font-semibold text-amber-900">
          Test mode: this records a synthetic delivery. No email or SMS is sent.
        </p>
      )}
      {isDisabledLiveEmail ? (
        <p className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm font-semibold text-red-900" role="alert">
          Live email is disabled: {liveDisabledReason ?? "configuration is incomplete"}
        </p>
      ) : null}
      {isLiveEmail && reviewingLiveSend ? (
        <div className="space-y-3 rounded-lg border-2 border-red-400 p-4">
          <p className="font-bold text-red-900">Final confirmation</p>
          <p>This will submit a real email through Resend to {liveSendCount} allowlisted recipient{liveSendCount === 1 ? "" : "s"}. Non-allowlisted recipients remain suppressed.</p>
          <input name="confirmedRecipientCount" type="hidden" value={liveSendCount} />
          <label className="flex items-start gap-2 font-semibold">
            <input className="mt-1 size-4" name="liveConfirmation"
              onChange={(event) => setLiveConfirmed(event.target.checked)}
              type="checkbox" value="confirmed" />
            <span>Send real email to {liveSendCount} recipient{liveSendCount === 1 ? "" : "s"}</span>
          </label>
        </div>
      ) : null}
      {state.message ? (
        <p className={state.success ? "text-emerald-700" : "text-red-700"}>
          {state.message}
        </p>
      ) : null}
      {isLiveEmail && !reviewingLiveSend ? (
        <button className="min-h-11 rounded-lg bg-red-700 px-5 font-semibold text-white"
          disabled={liveSendCount === 0} onClick={() => setReviewingLiveSend(true)}
          type="button">
          Review live email send
        </button>
      ) : (
        <button className="min-h-11 rounded-lg bg-sky-700 px-5 font-semibold text-white"
          disabled={pending || isDisabledLiveEmail || (isLiveEmail && !liveConfirmed)}>
          {pending ? "Submitting…" : isLiveEmail
            ? `Send real email to ${liveSendCount} recipient${liveSendCount === 1 ? "" : "s"}`
            : "Complete synthetic delivery"}
        </button>
      )}
    </form>
  );
}
