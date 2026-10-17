
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import {
  listHeaderNotifications,
  markAllHeaderNotificationsRead,
  markHeaderNotificationRead,
} from "@/features/notifications/services/header-notification-service";
import type { NotificationActionState } from "@/features/notifications/types/header-notification";

const notificationSchema = z.object({
  notificationType: z.enum(["announcement", "chat", "notification"]),
  notificationId: z.uuid(),
});

export async function openHeaderNotificationAction(formData: FormData) {
  const parsed = notificationSchema.safeParse({
    notificationType: formData.get("notificationType"),
    notificationId: formData.get("notificationId"),
  });

  if (!parsed.success) {
    redirect("/communications");
  }

  const notifications = await listHeaderNotifications();

  const notification = notifications.find(
    (item) =>
      item.type === parsed.data.notificationType &&
      item.id === parsed.data.notificationId,
  );

  if (!notification) {
    redirect("/communications");
  }

  // Navigation targets must come from the server, not from form input.
  const destination =
    notification.href.startsWith("/communications/") ||
    notification.href === "/communications"
      ? notification.href
      : "/communications";

  if (notification.type !== "chat") {
    const marked = await markHeaderNotificationRead(
      notification.type,
      notification.id,
    );

    if (marked) {
      revalidatePath("/", "layout");
    }
  }

  redirect(destination);
}

export async function markAllHeaderNotificationsReadAction(
  state: NotificationActionState,
): Promise<NotificationActionState> {
  void state;

  const success = await markAllHeaderNotificationsRead();

  if (!success) {
    return {
      success: false,
      message: "Notifications could not be updated.",
    };
  }

  revalidatePath("/", "layout");

  return {
    success: true,
    message: "Announcements, personal notifications, and chats marked as read.",
  };
}
