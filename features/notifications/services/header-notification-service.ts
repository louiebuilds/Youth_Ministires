import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { HeaderNotification } from "@/features/notifications/types/header-notification";

type RpcClient = {
  rpc(name: string, args?: Record<string, unknown>): Promise<{
    data: unknown;
    error: { code?: string } | null;
  }>;
};

async function rpc(name: string, args?: Record<string, unknown>) {
  return (await createClient() as unknown as RpcClient).rpc(name, args);
}

export async function listHeaderNotifications(): Promise<HeaderNotification[]> {
  const { data, error } = await rpc("list_header_notifications", { p_limit: 20 });
  if (error) {
    console.error("Header notification list failed", { operation: "list_header_notifications", code: error.code ?? "unknown" });
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

export async function markHeaderNotificationRead(type: string, id: string) {
  const { error } = await rpc("mark_header_notification_read", {
    p_notification_type: type,
    p_notification_id: id,
  });
  return !error;
}

export async function markAllHeaderNotificationsRead() {
  const { error } = await rpc("mark_all_header_notifications_read");
  return !error;
}
