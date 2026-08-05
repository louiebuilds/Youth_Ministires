"use server";

import { revalidatePath } from "next/cache";

import { answerPrayerRequestSchema, cancelFollowUpSchema, careFollowUpSchema, careNoteIdSchema, careNoteSchema, completeFollowUpSchema, prayerRequestIdSchema, prayerRequestSchema } from "@/features/prayer-care/schemas/prayer-request-schema";
import { answerPrayerRequest, archiveCareNote, archivePrayerRequest, cancelCareFollowUp, completeCareFollowUp, createCareFollowUp, createCareNote, createPrayerRequest } from "@/features/prayer-care/services/prayer-care-service";

export type PrayerCareActionState = { success: boolean; message?: string };

export async function createPrayerRequestAction(
  _state: PrayerCareActionState,
  formData: FormData,
): Promise<PrayerCareActionState> {
  const parsed = prayerRequestSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { success: false, message: "Review the prayer request details." };
  }
  if (!await createPrayerRequest(parsed.data)) {
    return { success: false, message: "The prayer request could not be created." };
  }
  revalidatePath("/prayer-care");
  return { success: true, message: "Prayer request created." };
}

export async function createCareFollowUpAction(_state: PrayerCareActionState, formData: FormData): Promise<PrayerCareActionState> {
  const parsed = careFollowUpSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { success: false, message: "Review the follow-up details." };
  const input = { ...parsed.data, dueAt: parsed.data.dueAt ? new Date(parsed.data.dueAt).toISOString() : null };
  if (!await createCareFollowUp(input)) return { success: false, message: "The follow-up could not be created." };
  revalidatePath("/prayer-care"); return { success: true, message: "Care follow-up created." };
}

export async function completeCareFollowUpAction(_state: PrayerCareActionState, formData: FormData): Promise<PrayerCareActionState> {
  const parsed = completeFollowUpSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success || !await completeCareFollowUp(parsed.data.careFollowUpId, parsed.data.completionNotes)) return { success: false, message: "The follow-up was not completed." };
  revalidatePath("/prayer-care"); return { success: true, message: "Follow-up completed." };
}

export async function cancelCareFollowUpAction(_state: PrayerCareActionState, formData: FormData): Promise<PrayerCareActionState> {
  const parsed = cancelFollowUpSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success || !await cancelCareFollowUp(parsed.data.careFollowUpId, parsed.data.cancellationReason)) return { success: false, message: "The follow-up was not cancelled." };
  revalidatePath("/prayer-care"); return { success: true, message: "Follow-up cancelled." };
}

export async function createCareNoteAction(_state: PrayerCareActionState, formData: FormData): Promise<PrayerCareActionState> {
  const parsed = careNoteSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { success: false, message: "Review the care-note details." };
  const input = { ...parsed.data, occurredAt: parsed.data.occurredAt ? new Date(parsed.data.occurredAt).toISOString() : null };
  if (!await createCareNote(input)) return { success: false, message: "The confidential care note could not be created." };
  revalidatePath("/prayer-care");
  return { success: true, message: "Confidential care note created." };
}

export async function archiveCareNoteAction(_state: PrayerCareActionState, formData: FormData): Promise<PrayerCareActionState> {
  const parsed = careNoteIdSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success || !await archiveCareNote(parsed.data.careNoteId)) {
    return { success: false, message: "The confidential care note was not archived." };
  }
  revalidatePath("/prayer-care");
  return { success: true, message: "Confidential care note archived." };
}

export async function answerPrayerRequestAction(_state: PrayerCareActionState, formData: FormData): Promise<PrayerCareActionState> {
  const parsed = answerPrayerRequestSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success || !await answerPrayerRequest(parsed.data.prayerRequestId, parsed.data.answerSummary)) {
    return { success: false, message: "The prayer request was not marked answered." };
  }
  revalidatePath("/prayer-care");
  return { success: true, message: "Prayer request marked answered." };
}

export async function archivePrayerRequestAction(_state: PrayerCareActionState, formData: FormData): Promise<PrayerCareActionState> {
  const parsed = prayerRequestIdSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success || !await archivePrayerRequest(parsed.data.prayerRequestId)) {
    return { success: false, message: "The prayer request was not archived." };
  }
  revalidatePath("/prayer-care");
  return { success: true, message: "Prayer request archived with history retained." };
}
