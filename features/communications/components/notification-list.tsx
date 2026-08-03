"use client";

import { useActionState } from "react";

import {
  markAllNotificationsReadAction,
  markNotificationReadAction,
} from "@/features/communications/actions/communication-actions";

import type {
  CommunicationActionState,
  InAppNotification,
} from "@/features/communications/types/communications";

const initialState: CommunicationActionState = { success: false };

function MarkNotificationReadForm({
  notificationId,
}: Readonly<{ notificationId: string }>) {
  const [state, action, pending] = useActionState(
    markNotificationReadAction,
    initialState,
  );
  return (
    <form action={action} className="mt-3 flex flex-wrap items-center gap-3">
      <input name="notificationId" type="hidden" value={notificationId} />
      <button className="min-h-11 rounded-lg border border-sky-700 px-4 font-semibold text-sky-800"
        disabled={pending}>Mark as read</button>
      {state.message ? <p className="text-sm">{state.message}</p> : null}
    </form>
  );
}

export function NotificationList({
  notifications,
  unreadCount,
}: Readonly<{
  notifications: InAppNotification[];
  unreadCount: number;
}>) {
  const [state, action, pending] = useActionState(
    markAllNotificationsReadAction,
    initialState,
  );
  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold">My notifications</h2>
          <p className="text-sm text-slate-600">{unreadCount} unread</p>
        </div>
        {unreadCount ? (
          <form action={action}>
            <button className="min-h-11 rounded-lg bg-slate-900 px-4 font-semibold text-white"
              disabled={pending}>Mark all as read</button>
          </form>
        ) : null}
      </div>
      {state.message ? <p className="text-sm">{state.message}</p> : null}
      {notifications.map((notification) => (
        <article className={`rounded-xl border p-5 ${
          notification.readAt
            ? "border-slate-200 bg-white"
            : "border-sky-300 bg-sky-50"
        }`} key={notification.notificationId}>
          <div className="flex flex-wrap justify-between gap-3">
            <h3 className="font-bold">{notification.title}</h3>
            <span className="text-sm font-semibold">
              {notification.readAt ? "Read" : "Unread"}
            </span>
          </div>
          <p className="mt-2 whitespace-pre-wrap">{notification.messageBody}</p>
          <p className="mt-2 text-xs text-slate-500">
            {new Date(notification.createdAt).toLocaleString()}
          </p>
          {!notification.readAt ? (
            <MarkNotificationReadForm
              notificationId={notification.notificationId} />
          ) : null}
        </article>
      ))}
      {!notifications.length ? (
        <p className="text-sm text-slate-600">No in-app notifications.</p>
      ) : null}
    </section>
  );
}
