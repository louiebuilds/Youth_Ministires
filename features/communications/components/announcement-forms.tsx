"use client";

import { useActionState } from "react";

import {
  archiveAnnouncementAction,
  publishAnnouncementAction,
  saveAnnouncementAction,
} from "@/features/communications/actions/communication-actions";

import type {
  Announcement,
  CommunicationActionState,
} from "@/features/communications/types/communications";

const initialState: CommunicationActionState = { success: false };
const field =
  "mt-1 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 py-2";

export function AnnouncementForm({
  announcement,
}: Readonly<{ announcement?: Announcement }>) {
  const [state, action, pending] = useActionState(
    saveAnnouncementAction,
    initialState,
  );
  const expiresAt = announcement?.expiresAt
    ? new Date(announcement.expiresAt).toISOString().slice(0, 16)
    : "";
  return (
    <form action={action} className="space-y-4">
      {announcement ? (
        <input name="announcementId" type="hidden"
          value={announcement.announcementId} />
      ) : null}
      <label className="block text-sm font-semibold">Title
        <input className={field} defaultValue={announcement?.title ?? ""}
          maxLength={200} name="title" required />
      </label>
      <label className="block text-sm font-semibold">Audience
        <select className={field}
          defaultValue={announcement?.audienceType ?? "ministry"}
          name="audienceType">
          <option value="ministry">Entire ministry</option>
          <option value="parents">Parents and guardians</option>
          <option value="volunteers">Volunteers</option>
        </select>
      </label>
      <label className="block text-sm font-semibold">Message
        <textarea className={field}
          defaultValue={announcement?.messageBody ?? ""}
          maxLength={10000} name="messageBody" required rows={5} />
      </label>
      <label className="block text-sm font-semibold">Expires (optional)
        <input className={field} defaultValue={expiresAt}
          name="expiresAt" type="datetime-local" />
      </label>
      {state.message ? (
        <p className={state.success ? "text-emerald-700" : "text-red-700"}>
          {state.message}
        </p>
      ) : null}
      <button className="min-h-11 rounded-lg bg-sky-700 px-5 font-semibold text-white"
        disabled={pending}>
        {pending ? "Saving…" : announcement ? "Save changes" : "Create draft"}
      </button>
    </form>
  );
}

export function AnnouncementLifecycleForms({
  announcement,
}: Readonly<{ announcement: Announcement }>) {
  const [publishState, publishAction, publishing] = useActionState(
    publishAnnouncementAction, initialState,
  );
  const [archiveState, archiveAction, archiving] = useActionState(
    archiveAnnouncementAction, initialState,
  );
  return (
    <div className="flex flex-wrap items-center gap-3">
      {!announcement.publishedAt ? (
        <form action={publishAction}>
          <input name="announcementId" type="hidden"
            value={announcement.announcementId} />
          <button className="min-h-11 rounded-lg bg-emerald-700 px-4 font-semibold text-white"
            disabled={publishing}>Publish</button>
        </form>
      ) : null}
      <form action={archiveAction}>
        <input name="announcementId" type="hidden"
          value={announcement.announcementId} />
        <button className="min-h-11 rounded-lg border border-red-300 px-4 font-semibold text-red-800"
          disabled={archiving}>Archive</button>
      </form>
      {[publishState.message, archiveState.message].filter(Boolean).map(
        (message) => <p className="text-sm" key={message}>{message}</p>,
      )}
    </div>
  );
}
