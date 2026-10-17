
import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { HeaderNotification } from "@/features/notifications/types/header-notification";

type RpcClient = {
  rpc(
    name: string,
    args?: Record<string, unknown>,
  ): Promise<{
    data: unknown;
    error: { code?: string } | null;
  }>;
};

async function rpc(name: string, args?: Record<string, unknown>) {
  return (await createClient() as unknown as RpcClient).rpc(name, args);
}

export async function listHeaderNotifications(): Promise<HeaderNotification[]> {
  const { data, error } = await rpc("list_header_notifications", {
    p_limit: 20,
  });

  if (error) {
    console.error("Header notification list failed", {
      operation: "list_header_notifications",
      code: error.code ?? "unknown",
    });
    return [];
  }

  return ((data ?? []) as Record<string, unknown>[]).map((row) => ({
    type: row.notification_type as HeaderNotification["type"],
    id: String(row.notification_id),
    title: String(row.title),
    occurredAt: row.occurred_at as string | null,
    readAt: row.read_at as string | null,
    href: String(row.href),
  }));
}

export async function getHeaderUnreadCount(): Promise<number> {
  const { data, error } = await rpc("get_header_unread_count");

  if (error) {
    console.error("Header unread count failed", {
      operation: "get_header_unread_count",
      code: error.code ?? "unknown",
    });
    return 0;
  }

  const count = Number(data);

  if (!Number.isSafeInteger(count) || count < 0) {
    console.error("Header unread count returned an invalid value");
    return 0;
  }

  return count;
}

export async function markHeaderNotificationRead(
  type: string,
  id: string,
): Promise<boolean> {
  const { error } = await rpc("mark_header_notification_read", {
    p_notification_type: type,
    p_notification_id: id,
  });

  if (error) {
    console.error("Mark header notification read failed", {
      operation: "mark_header_notification_read",
      code: error.code ?? "unknown",
    });
  }

  return !error;
}

export async function markAllHeaderNotificationsRead(): Promise<boolean> {
  const { error } = await rpc("mark_all_header_notifications_read");

  if (error) {
    console.error("Mark all header notifications read failed", {
      operation: "mark_all_header_notifications_read",
      code: error.code ?? "unknown",
    });
  }

  return !error;
}
