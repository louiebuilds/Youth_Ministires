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
  smsMode,
  totalRecipientCount,
  liveSendCount,
  suppressedCount,
  idempotencyKey,
}: Readonly<{
  audienceType: "parents" | "volunteers";
  channel: "in_app" | "email" | "sms";
  templates: CommunicationTemplate[];
  emailMode: "synthetic" | "live" | "disabled";
  smsMode: "synthetic" | "live" | "disabled";
  totalRecipientCount: number;
  liveSendCount: number;
  suppressedCount: number;
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
  const isLiveSms = channel === "sms" && smsMode === "live";
  const isDisabledLiveSms = channel === "sms" && smsMode === "disabled";
  const isLiveSend = isLiveEmail || isLiveSms;
  const isDisabledLiveSend = isDisabledLiveEmail || isDisabledLiveSms;

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
      {channel === "email" ? (
        <label className="block text-sm font-semibold" htmlFor="compose-subject">Email subject
          <input className={field} id="compose-subject" maxLength={200}
            name="subject" onChange={(event) => setSubject(event.target.value)}
            required value={subject} />
        </label>
      ) : <input name="subject" type="hidden" value="" />}
      <label className="block text-sm font-semibold" htmlFor="compose-template">
        Template (optional)
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
      <label className="block text-sm font-semibold" htmlFor="compose-message">Message
        <textarea className={field} id="compose-message" maxLength={10000}
          name="messageBody"
          onChange={(event) => setMessageBody(event.target.value)}
          required rows={6} value={messageBody} />
      </label>
      <p className="text-sm text-slate-600">
        Template content is copied into these fields and can be edited before delivery.
      </p>
      {channel === "in_app" ? (
        <div className="rounded-lg border border-sky-200 bg-sky-50 p-3 text-sm text-sky-950">
          <p className="font-bold">In-app message</p>
          <p className="mt-1">
            This message will appear inside the Youth Ministries Platform for the selected recipients.
          </p>
        </div>
      ) : null}
      {isLiveEmail ? (
        <div className="rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-950">
          <p className="font-bold">Live email ready</p>
          <p className="mt-1">Audience: {audienceType}</p>
          <p className="mt-1">{liveSendCount} recipient{liveSendCount === 1 ? "" : "s"} will receive this email · {suppressedCount} not included</p>
        </div>
      ) : null}
      {isDisabledLiveEmail ? (
        <p className="rounded-lg border border-sky-200 bg-sky-50 p-3 text-sm text-sky-950">
          Email setup is not complete. Please try again after setup is finished.
        </p>
      ) : null}
      {isLiveSms ? (
        <div className="rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-950">
          <p className="font-bold">Live text message ready</p>
          <p className="mt-1">Channel: SMS</p>
          <p className="mt-1">Selected audience: {audienceType}</p>
          <p className="mt-1">Total recipients found: {totalRecipientCount}</p>
          <p className="mt-1">Available for live SMS: {liveSendCount} · Not included: {suppressedCount}</p>
          <p className="mt-2 font-semibold">This sends a real text message.</p>
        </div>
      ) : null}
      {isDisabledLiveSms ? (
        <p className="rounded-lg border border-sky-200 bg-sky-50 p-3 text-sm text-sky-950">
          Text message setup is not complete. Please try again after setup is finished.
        </p>
      ) : null}
      {isLiveSend && reviewingLiveSend ? (
        <div className="space-y-3 rounded-lg border-2 border-red-400 p-4">
          <p className="font-bold text-red-900">Final confirmation</p>
          <p>This will send a real {isLiveSms ? "text message" : "email"} to {liveSendCount} recipient{liveSendCount === 1 ? "" : "s"}. Other recipients will not be included.</p>
          <input name="confirmedRecipientCount" type="hidden" value={liveSendCount} />
          <label className="flex items-start gap-2 font-semibold">
            <input className="mt-1 size-4" name="liveConfirmation"
              onChange={(event) => setLiveConfirmed(event.target.checked)}
              type="checkbox" value="confirmed" />
            <span>Send real {isLiveSms ? "text message" : "email"} to {liveSendCount} recipient{liveSendCount === 1 ? "" : "s"}</span>
          </label>
        </div>
      ) : null}
      {state.message ? (
        <p className={state.success ? "text-emerald-700" : "text-red-700"}>
          {communicationResultMessage(state, channel, isLiveEmail, isLiveSms)}
        </p>
      ) : null}
      {isLiveSend && !reviewingLiveSend ? (
        <button className="min-h-11 rounded-lg bg-red-700 px-5 font-semibold text-white"
          disabled={liveSendCount === 0} onClick={() => setReviewingLiveSend(true)}
          type="button">
          Review {isLiveSms ? "text message" : "email"}
        </button>
      ) : (
        <button className="min-h-11 rounded-lg bg-sky-700 px-5 font-semibold text-white"
          disabled={pending || isDisabledLiveSend || (isLiveSend && !liveConfirmed)}>
          {pending ? "Submitting…" : isLiveEmail
            ? `Send email to ${liveSendCount} recipient${liveSendCount === 1 ? "" : "s"}`
            : isLiveSms
              ? `Send text message to ${liveSendCount} recipient${liveSendCount === 1 ? "" : "s"}`
            : channel === "email"
              ? "Save email preview"
              : channel === "sms"
                ? "Save text message preview"
                : "Review message"}
        </button>
      )}
    </form>
  );
}

function communicationResultMessage(
  state: CommunicationActionState,
  channel: "in_app" | "email" | "sms",
  isLiveEmail: boolean,
  isLiveSms: boolean,
) {
  if (state.success && isLiveEmail && state.sentCount !== undefined) {
    return `${state.sentCount} email${state.sentCount === 1 ? "" : "s"} sent to the email service; ${state.failedCount ?? 0} failed; ${state.suppressedCount ?? 0} not included.`;
  }
  if (state.success && isLiveSms && state.sentCount !== undefined) {
    return `${state.sentCount} text message${state.sentCount === 1 ? "" : "s"} submitted; ${state.failedCount ?? 0} failed; ${state.suppressedCount ?? 0} not included.`;
  }
  if (state.success) {
    if (channel === "email") return "Email preview saved. No email was sent.";
    if (channel === "sms") return "Text message preview saved. No text message was sent.";
    return "Message preview completed and recorded. No message was sent.";
  }
  if (state.message === "The synthetic delivery failed.") {
    return "The message preview could not be saved.";
  }
  return state.message;
}
