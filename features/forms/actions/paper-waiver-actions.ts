"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { recordPaperEventWaiver } from "@/features/forms/services/paper-waiver-service";
import type { EventActionState } from "@/features/events/types/event-management";

const paperWaiverSchema = z.object({
  eventId: z.string().uuid(),
  requirementId: z.string().uuid(),
  studentId: z.string().uuid(),
  reason: z
    .string()
    .trim()
    .max(1000)
    .optional(),
});

export async function recordPaperEventWaiverAction(
  _: EventActionState,
  formData: FormData,
): Promise<EventActionState> {
  const parsed = paperWaiverSchema.safeParse({
    eventId: formData.get("eventId"),
    requirementId: formData.get("requirementId"),
    studentId: formData.get("studentId"),
    reason: formData.get("reason"),
  });

  if (!parsed.success) {
    return {
      success: false,
      message: "Review the paper waiver information.",
    };
  }

  if (
    parsed.data.reason &&
    parsed.data.reason.length > 0 &&
    parsed.data.reason.length < 5
  ) {
    return {
      success: false,
      message:
        "The optional note must be at least 5 characters.",
    };
  }

  try {
    await recordPaperEventWaiver(
      parsed.data.requirementId,
      parsed.data.studentId,
      parsed.data.reason || undefined,
    );

    revalidatePath(
      `/events/${parsed.data.eventId}`,
    );
    revalidatePath("/permission-forms");

    return {
      success: true,
      message:
        "Paper waiver recorded and retained in document history.",
    };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Paper waiver receipt was denied.",
    };
  }
}