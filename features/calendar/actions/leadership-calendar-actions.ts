"use server";

import { revalidatePath } from "next/cache";

import { requireCapability } from "@/features/auth/services/authorization-service";
import {
  leadershipCalendarEntryIdSchema,
  leadershipCalendarEntrySchema,
} from "@/features/calendar/schemas/leadership-calendar-schema";
import {
  createLeadershipCalendarEntry,
  deleteLeadershipCalendarEntry,
  updateLeadershipCalendarEntry,
} from "@/features/calendar/services/platform-calendar-service";
import type { CalendarActionState } from "@/features/calendar/types/platform-calendar";

async function requireYouthDirector() {
  const account = await requireCapability("events.view");
  if (account.role !== "youth_pastor") throw new Error("Leadership calendar management is denied.");
}

export async function saveLeadershipCalendarEntryAction(
  _state: CalendarActionState,
  formData: FormData,
): Promise<CalendarActionState> {
  await requireYouthDirector();
  const parsed = leadershipCalendarEntrySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { success: false, message: "Review the entry details and times." };
  const { entryId, ...input } = parsed.data;
  const saved = entryId
    ? await updateLeadershipCalendarEntry(entryId, input)
    : Boolean(await createLeadershipCalendarEntry(input));
  if (!saved) return { success: false, message: "The leadership entry could not be saved." };
  revalidatePath("/calendar");
  return { success: true, message: entryId ? "Leadership entry updated." : "Leadership entry added." };
}

export async function deleteLeadershipCalendarEntryAction(
  _state: CalendarActionState,
  formData: FormData,
): Promise<CalendarActionState> {
  await requireYouthDirector();
  const parsed = leadershipCalendarEntryIdSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success || !await deleteLeadershipCalendarEntry(parsed.data.entryId)) {
    return { success: false, message: "The leadership entry could not be deleted." };
  }
  revalidatePath("/calendar");
  return { success: true, message: "Leadership entry deleted." };
}
