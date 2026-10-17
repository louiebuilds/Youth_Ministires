
"use client";

import { useActionState, useEffect } from "react";
import { Bell, MessageCircle, Megaphone } from "lucide-react";
import { useRouter } from "next/navigation";

import {
  markAllHeaderNotificationsReadAction,
  openHeaderNotificationAction,
} from "@/features/notifications/actions/header-notification-actions";
import type { HeaderNotification } from "@/features/notifications/types/header-notification";

const label = {
  announcement: "Announcement",
  chat: "Chat",
  notification: "Notification",
} as const;

type NotificationCenterProps = Readonly<{
  notifications: HeaderNotification[];
  unreadCount: number;
}>;

export function NotificationCenter({
  notifications,
  unreadCount,
}: NotificationCenterProps) {
  const router = useRouter();

  const [state, action, pending] = useActionState(
    markAllHeaderNotificationsReadAction,
    { success: false },
  );

  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState === "visible") {
        router.refresh();
      }
    };

    const timer = window.setInterval(refresh, 25_000);

    document.addEventListener("visibilitychange", refresh);

    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [router]);

  return (
    <details className="group relative" suppressHydrationWarning>
      <summary
        aria-label={`Notifications${
          unreadCount ? `, ${unreadCount} unread` : ""
        }`}
        className="relative grid size-11 cursor-pointer list-none place-items-center rounded-lg text-slate-700 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700 [&::-webkit-details-marker]:hidden"
      >
        <Bell aria-hidden="true" className="size-5" />

        {unreadCount > 0 ? (
          <span className="absolute right-0.5 top-0.5 min-w-5 rounded-full bg-red-600 px-1 text-center text-xs font-bold leading-5 text-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        ) : null}
      </summary>

      <div className="absolute right-0 z-50 mt-2 w-[min(24rem,calc(100vw-1.5rem))] rounded-xl border border-slate-200 bg-white p-3 shadow-xl">
        <div className="flex items-center justify-between gap-3 border-b pb-3">
          <div>
            <h2 className="font-bold">Notifications</h2>
            <p className="text-xs text-slate-500">
              {unreadCount} unread
            </p>
          </div>

          {unreadCount > 0 ? (
            <form action={action}>
              <button
                type="submit"
                className="text-sm font-semibold text-sky-800 disabled:opacity-60"
                disabled={pending}
              >
                {pending ? "Marking..." : "Mark all read"}
              </button>
            </form>
          ) : null}
        </div>

        {state.message ? (
          <p className="py-2 text-xs text-slate-600">
            {state.message}
          </p>
        ) : null}

        <div className="max-h-96 space-y-1 overflow-y-auto py-2">
          {notifications.map((item) => {
            const unread = item.type === "chat" || !item.readAt;
            const Icon =
              item.type === "chat" ? MessageCircle : Megaphone;

            return (
              <form
                action={openHeaderNotificationAction}
                key={`${item.type}-${item.id}`}
              >
                <input
                  name="notificationType"
                  type="hidden"
                  value={item.type}
                />
                <input
                  name="notificationId"
                  type="hidden"
                  value={item.id}
                />
                <input
                  name="href"
                  type="hidden"
                  value={item.href}
                />

                <button
                  type="submit"
                  className={`flex w-full gap-3 rounded-lg p-3 text-left hover:bg-slate-100 ${
                    unread ? "bg-sky-50" : ""
                  }`}
                >
                  <Icon
                    aria-hidden="true"
                    className="mt-0.5 size-4 shrink-0 text-sky-700"
                  />

                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold">
                      {item.title}
                    </span>

                    <span className="mt-0.5 block text-xs text-slate-500">
                      {label[item.type]}
                      {item.occurredAt
                        ? ` · ${new Date(item.occurredAt).toLocaleString()}`
                        : ""}
                    </span>
                  </span>

                  {unread ? (
                    <span
                      aria-label="Unread"
                      className="mt-1 size-2 shrink-0 rounded-full bg-sky-600"
                    />
                  ) : null}
                </button>
              </form>
            );
          })}

          {notifications.length === 0 ? (
            <p className="p-4 text-center text-sm text-slate-500">
              You&apos;re all caught up.
            </p>
          ) : null}
        </div>
      </div>
    </details>
  );
}
