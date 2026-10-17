"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import {
  markAllHeaderNotificationsRead,
  markHeaderNotificationRead,
} from "@/features/notifications/services/header-notification-service";
import type { NotificationActionState } from "@/features/notifications/types/header-notification";

const notificationSchema = z.object({
  notificationType: z.enum(["announcement", "chat", "notification"]),
  notificationId: z.uuid(),
  href: z.string().startsWith("/communications").max(300),
});

export async function openHeaderNotificationAction(formData: FormData) {
  const parsed = notificationSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect("/communications");
  if (parsed.data.notificationType !== "chat") {
    await markHeaderNotificationRead(parsed.data.notificationType, parsed.data.notificationId);
  }
  revalidatePath("/", "layout");
  redirect(parsed.data.href);
}

export async function markAllHeaderNotificationsReadAction(
  state: NotificationActionState,
): Promise<NotificationActionState> {
  void state;
  if (!await markAllHeaderNotificationsRead()) {
    return { success: false, message: "Notifications could not be updated." };
  }
  revalidatePath("/", "layout");
  return { success: true, message: "Announcements and notifications marked as read." };
}
