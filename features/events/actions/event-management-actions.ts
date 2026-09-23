"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  archiveEventSchema,
  eventDetailsSchema,
  eventRegistrationSettingsSchema,
} from "@/features/events/schemas/event-management-schema";
import {
  archiveEvent,
  cancelMyEventRegistration,
  createEventChecklistItem,
  createEventReminder,
  createEvent,
  createEventParticipationOverride,
  promoteWaitlistedRegistration,
  registerMyStudentForEvent,
  setEventChecklistItemCompleted,
  setEventReminderStatus,
  updateEvent,
  updateEventRegistrationSettings,
} from "@/features/events/services/event-management-service";
import {
  scheduleVolunteer,
  setAssignmentStatus,
} from "@/features/volunteers/services/volunteer-management-service";

import type { EventActionState } from "@/features/events/types/event-management";

export async function createEventAction(
  _state: EventActionState,
  formData: FormData,
): Promise<EventActionState> {
  const parsed = eventDetailsSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success || parsed.data.endsAt <= parsed.data.startsAt) {
    return { success: false, message: "Review the event details." };
  }
  const result = await createEvent(parsed.data);
  if (!result.success) {
    return { success: false, message: "This event could not be created." };
  }
  revalidatePath("/events");
  redirect(`/events/${result.eventId}`);
}

export async function updateEventAction(
  _state: EventActionState,
  formData: FormData,
): Promise<EventActionState> {
  const parsed = eventDetailsSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success || !parsed.data.eventId ||
    parsed.data.endsAt <= parsed.data.startsAt) {
    return { success: false, message: "Review the event details." };
  }
  if (!await updateEvent(parsed.data.eventId, parsed.data)) {
    return { success: false, message: "This event update was not allowed." };
  }
  revalidatePath("/events");
  revalidatePath(`/events/${parsed.data.eventId}`);
  return { success: true, message: "Event updated and audited." };
}

export async function archiveEventAction(
  _state: EventActionState,
  formData: FormData,
): Promise<EventActionState> {
  const parsed = archiveEventSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success || !await archiveEvent(parsed.data.eventId)) {
    return { success: false, message: "This event could not be archived." };
  }
  revalidatePath("/events");
  redirect("/events");
}

export async function updateEventRegistrationSettingsAction(
  _state: EventActionState,
  formData: FormData,
): Promise<EventActionState> {
  const raw = Object.fromEntries(formData);
  const parsed = eventRegistrationSettingsSchema.safeParse({
    ...raw,
    registrationOpensAt: raw.registrationOpensAt || null,
    registrationClosesAt: raw.registrationClosesAt || null,
  });
  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.issues[0]?.message ?? "Review the registration settings.",
    };
  }
  if (!await updateEventRegistrationSettings(parsed.data)) {
    return {
      success: false,
      message: "Registration settings could not be updated.",
    };
  }
  revalidatePath("/events");
  revalidatePath(`/events/${parsed.data.eventId}`);
  return { success: true, message: "Registration settings updated and audited." };
}
const registrationRequestSchema = z.object({
  eventId: z.string().uuid(),
  studentId: z.string().uuid(),
});

const registrationCancellationSchema = z.object({
  eventId: z.string().uuid(),
  registrationId: z.string().uuid(),
});

const waitlistPromotionSchema = z.object({
  eventId: z.string().uuid(),
  registrationId: z.string().uuid(),
});

const participationOverrideSchema = z.object({
  eventId: z.string().uuid(),
  registrationId: z.string().uuid(),
  requirementIds: z.array(z.string().uuid()).min(1),
  reason: z.string().trim().min(5).max(2000),
});

const eventVolunteerScheduleSchema = z.object({
  eventId: z.string().uuid(),
  profileId: z.string().uuid(),
  assignmentRole: z.string().trim().min(1).max(100),
});

const eventVolunteerStatusSchema = z.object({
  eventId: z.string().uuid(),
  assignmentId: z.string().uuid(),
  status: z.enum([
    "assigned", "confirmed", "declined", "cancelled", "completed",
  ]),
});

const eventReminderSchema = z.object({
  eventId: z.string().uuid(),
  title: z.string().trim().min(1).max(200),
  remindAt: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/),
  notes: z.string().trim().max(1000).transform((value) => value || null),
});

const eventReminderStatusSchema = z.object({
  eventId: z.string().uuid(),
  reminderId: z.string().uuid(),
  status: z.enum(["scheduled", "completed", "cancelled"]),
});

const eventChecklistSchema = z.object({
  eventId: z.string().uuid(),
  title: z.string().trim().min(1).max(200),
  notes: z.string().trim().max(1000).transform((value) => value || null),
  dueAt: z.string().transform((value) => value || null).pipe(
    z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/).nullable(),
  ),
});

const eventChecklistStatusSchema = z.object({
  eventId: z.string().uuid(),
  checklistItemId: z.string().uuid(),
  isCompleted: z.enum(["true", "false"]).transform((value) => value === "true"),
});

export async function registerMyStudentForEventAction(
  _state: EventActionState,
  formData: FormData,
): Promise<EventActionState> {
  const parsed = registrationRequestSchema.safeParse(
    Object.fromEntries(formData),
  );

  if (!parsed.success) {
    return { success: false, message: "Registration details are invalid." };
  }

  const result = await registerMyStudentForEvent(
    parsed.data.eventId,
    parsed.data.studentId,
  );

  if (!result.success) {
    return {
      success: false,
      message: result.message,
    };
  }

  revalidatePath(`/events/${parsed.data.eventId}`);

  return {
    success: true,
    message: result.status === "waitlisted"
      ? "Student added to the waitlist."
      : "Student registered successfully.",
  };
}

export async function cancelMyEventRegistrationAction(
  _state: EventActionState,
  formData: FormData,
): Promise<EventActionState> {
  const parsed = registrationCancellationSchema.safeParse(
    Object.fromEntries(formData),
  );

  if (!parsed.success ||
      !await cancelMyEventRegistration(parsed.data.registrationId)) {
    return {
      success: false,
      message: "This registration could not be cancelled.",
    };
  }

  revalidatePath(`/events/${parsed.data.eventId}`);

  return {
    success: true,
    message: "Registration cancelled.",
  };
}

export async function manageEventRegistrationAction(
  state: EventActionState,
  formData: FormData,
): Promise<EventActionState> {
  const intent = formData.get("intent");
  if (intent === "register") {
    return registerMyStudentForEventAction(state, formData);
  }
  if (intent === "cancel") {
    return cancelMyEventRegistrationAction(state, formData);
  }
  return { success: false, message: "Registration action is invalid." };
}
export async function promoteWaitlistedRegistrationAction(
  _state: EventActionState,
  formData: FormData,
): Promise<EventActionState> {
  const parsed = waitlistPromotionSchema.safeParse(
    Object.fromEntries(formData),
  );
  if (!parsed.success) {
    return { success: false, message: "Waitlist details are invalid." };
  }
  const result = await promoteWaitlistedRegistration(
    parsed.data.registrationId,
  );
  if (!result.success) {
    return { success: false, message: result.message };
  }
  revalidatePath(`/events/${parsed.data.eventId}`);
  return { success: true, message: "Student promoted from the waitlist." };
}

export async function createParticipationOverrideAction(
  _state: EventActionState,
  formData: FormData,
): Promise<EventActionState> {
  const parsed = participationOverrideSchema.safeParse({
    eventId: formData.get("eventId"),
    registrationId: formData.get("registrationId"),
    requirementIds: formData.getAll("requirementId"),
    reason: formData.get("reason"),
  });
  if (!parsed.success) return { success: false, message: "An explicit override reason is required." };
  const result = await createEventParticipationOverride(parsed.data);
  if (!result.success) return { success: false, message: result.message };
  revalidatePath(`/events/${parsed.data.eventId}`);
  revalidatePath("/check-in");
  return { success: true, message: "Participation override approved and audited." };
}

export async function scheduleEventVolunteerAction(
  _state: EventActionState,
  formData: FormData,
): Promise<EventActionState> {
  const parsed = eventVolunteerScheduleSchema.safeParse(
    Object.fromEntries(formData),
  );
  if (!parsed.success) {
    return { success: false, message: "Review the volunteer assignment." };
  }
  if (!await scheduleVolunteer({
    ...parsed.data,
    startsAt: null,
    endsAt: null,
  })) {
    return { success: false, message: "This volunteer could not be assigned." };
  }
  revalidatePath(`/events/${parsed.data.eventId}`);
  revalidatePath(`/volunteers/${parsed.data.profileId}`);
  return { success: true, message: "Volunteer assigned and audited." };
}

export async function updateEventVolunteerStatusAction(
  _state: EventActionState,
  formData: FormData,
): Promise<EventActionState> {
  const parsed = eventVolunteerStatusSchema.safeParse(
    Object.fromEntries(formData),
  );
  if (!parsed.success ||
    !await setAssignmentStatus(parsed.data.assignmentId, parsed.data.status)) {
    return { success: false, message: "Assignment status was not updated." };
  }
  revalidatePath(`/events/${parsed.data.eventId}`);
  return { success: true, message: "Assignment status updated and audited." };
}

export async function createEventReminderAction(
  _state: EventActionState,
  formData: FormData,
): Promise<EventActionState> {
  const parsed = eventReminderSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { success: false, message: "Review the reminder details." };
  }
  const result = await createEventReminder(parsed.data);
  if (!result.success) return { success: false, message: result.message };
  revalidatePath(`/events/${parsed.data.eventId}`);
  return { success: true, message: "Reminder created and audited." };
}

export async function setEventReminderStatusAction(
  _state: EventActionState,
  formData: FormData,
): Promise<EventActionState> {
  const parsed = eventReminderStatusSchema.safeParse(
    Object.fromEntries(formData),
  );
  if (!parsed.success ||
    !await setEventReminderStatus(parsed.data.reminderId, parsed.data.status)) {
    return { success: false, message: "Reminder status was not updated." };
  }
  revalidatePath(`/events/${parsed.data.eventId}`);
  return { success: true, message: "Reminder status updated and audited." };
}

export async function createEventChecklistItemAction(
  _state: EventActionState,
  formData: FormData,
): Promise<EventActionState> {
  const parsed = eventChecklistSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { success: false, message: "Review the checklist item." };
  }
  const result = await createEventChecklistItem(parsed.data);
  if (!result.success) return { success: false, message: result.message };
  revalidatePath(`/events/${parsed.data.eventId}`);
  return { success: true, message: "Checklist item created and audited." };
}

export async function setEventChecklistItemCompletedAction(
  _state: EventActionState,
  formData: FormData,
): Promise<EventActionState> {
  const parsed = eventChecklistStatusSchema.safeParse(
    Object.fromEntries(formData),
  );
  if (!parsed.success || !await setEventChecklistItemCompleted(
    parsed.data.checklistItemId,
    parsed.data.isCompleted,
  )) {
    return { success: false, message: "Checklist item was not updated." };
  }
  revalidatePath(`/events/${parsed.data.eventId}`);
  return { success: true, message: "Checklist item updated and audited." };
}
