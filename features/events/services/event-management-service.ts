import "server-only";

import { eventWorkspaceSchema } from "@/features/events/schemas/event-workspace-schema";
import { createClient } from "@/lib/supabase/server";



import type {
  EventCalendarEntry,
  EventChecklistItem,
  EventReminder,
  EventRegistrationOption,
  EventRegistrationSettings,
  EventVolunteerAssignment,
  EventVolunteerCandidate,
  EventWorkspace,
  ManagedEventRegistration,
} from "@/features/events/types/event-management";
import type { EventStatus } from "@/lib/supabase/database.types";


type EventInput = {
  name: string;
  eventType: string;
  status: Exclude<EventStatus, "archived">;
  description: string | null;
  startsAt: string;
  endsAt: string;
  timezone: string;
  capacity: number | null;
  campus: string | null;
  building: string | null;
  room: string | null;
  address: string | null;
  meetingInstructions: string | null;
};

const rpcInput = (input: EventInput) => ({
  p_name: input.name,
  p_event_type: input.eventType,
  p_status: input.status,
  p_description: input.description,
  p_starts_at: input.startsAt,
  p_ends_at: input.endsAt,
  p_timezone: input.timezone,
  p_capacity: input.capacity,
  p_campus: input.campus,
  p_building: input.building,
  p_room: input.room,
  p_address: input.address,
  p_meeting_instructions: input.meetingInstructions,
});

export async function listEventCalendar(input: {
  fromDate: string;
  toDate: string;
  search: string | null;
  status: EventStatus | null;
}): Promise<EventCalendarEntry[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("list_event_calendar", {
    p_from_date: input.fromDate,
    p_to_date: input.toDate,
    p_search: input.search,
    p_status: input.status,
  });
  if (error) return [];
  return (data ?? []).map((event) => ({
    eventId: event.event_id,
    eventName: event.event_name,
    eventType: event.event_type,
    eventStatus: event.event_status,
    startsAt: event.starts_at,
    endsAt: event.ends_at,
    timezone: event.timezone,
    capacity: event.capacity,
    campus: event.campus,
    building: event.building,
    room: event.room,
    canManage: event.can_manage,
  }));
}

export async function getEventWorkspace(
  eventId: string,
): Promise<EventWorkspace | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_event_workspace", {
    p_event_id: eventId,
  });
  if (error) return null;
  const parsed = eventWorkspaceSchema.safeParse(data);
  return parsed.success ? parsed.data : null;
}

export async function getEventRegistrationSettings(
  eventId: string,
): Promise<EventRegistrationSettings | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc(
    "get_event_registration_settings",
    { p_event_id: eventId },
  );
  if (error || !data || typeof data !== "object" || Array.isArray(data)) {
    return null;
  }
  const value = data as Record<string, unknown>;
  if (typeof value.eventId !== "string") return null;
  return value as EventRegistrationSettings;
}

export async function updateEventRegistrationSettings(input: {
  eventId: string;
  capacity: number | null;
  waitlistCapacity: number | null;
  registrationOpensAt: string | null;
  registrationClosesAt: string | null;
}) {
  const supabase = await createClient();
  const { error } = await supabase.rpc(
    "update_event_registration_settings",
    {
      p_event_id: input.eventId,
      p_capacity: input.capacity,
      p_waitlist_capacity: input.waitlistCapacity,
      p_registration_opens_at: input.registrationOpensAt,
      p_registration_closes_at: input.registrationClosesAt,
    },
  );
  return !error;
}

export async function createEvent(input: EventInput) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_event", rpcInput(input));
  return error || !data
    ? { success: false as const }
    : { success: true as const, eventId: data };
}

export async function updateEvent(eventId: string, input: EventInput) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("update_event", {
    p_event_id: eventId,
    ...rpcInput(input),
  });
  return !error;
}

export async function archiveEvent(eventId: string) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("archive_event", {
    p_event_id: eventId,
  });
  return !error;
}
export async function listMyEventRegistrationOptions(
  eventId: string,
): Promise<EventRegistrationOption[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc(
    "list_my_event_registration_options",
    { p_event_id: eventId },
  );

  if (error) return [];

  return (data ?? []).map((option) => ({
    studentId: option.student_id,
    studentName: option.student_name,
    householdId: option.household_id,
    householdName: option.household_name,
    registrationId: option.registration_id,
    registrationStatus: option.registration_status,
  }));
}

export async function registerMyStudentForEvent(
  eventId: string,
  studentId: string,
) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc(
    "register_my_student_for_event",
    {
      p_event_id: eventId,
      p_student_id: studentId,
    },
  );

  return error
    ? { success: false as const, message: error.message }
    : { success: true as const, status: data };
}

export async function cancelMyEventRegistration(
  registrationId: string,
) {
  const supabase = await createClient();
  const { error } = await supabase.rpc(
    "cancel_my_event_registration",
    { p_registration_id: registrationId },
  );

  return !error;
}

export async function listEventRegistrations(
  eventId: string,
): Promise<ManagedEventRegistration[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("list_event_registrations", {
    p_event_id: eventId,
  });
  if (error) return [];
  return (data ?? []).map((registration) => ({
    registrationId: registration.registration_id,
    studentId: registration.student_id,
    studentName: registration.student_name,
    householdName: registration.household_name,
    registrationStatus: registration.registration_status,
    waitlistPosition: registration.waitlist_position,
    createdAt: registration.created_at,
  }));
}

export async function promoteWaitlistedRegistration(
  registrationId: string,
) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("promote_waitlisted_registration", {
    p_registration_id: registrationId,
  });
  return error
    ? { success: false as const, message: error.message }
    : { success: true as const };
}

export async function listEventVolunteerAssignments(
  eventId: string,
): Promise<EventVolunteerAssignment[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc(
    "list_event_volunteer_assignments",
    { p_event_id: eventId },
  );
  if (error) return [];
  return (data ?? []).map((assignment) => ({
    assignmentId: assignment.assignment_id,
    profileId: assignment.profile_id,
    displayName: assignment.display_name,
    assignmentRole: assignment.assignment_role,
    assignmentStatus: assignment.assignment_status,
    assignmentStartsAt: assignment.assignment_starts_at,
    assignmentEndsAt: assignment.assignment_ends_at,
  }));
}

export async function listEventVolunteerCandidates(
  eventId: string,
): Promise<EventVolunteerCandidate[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc(
    "list_event_volunteer_candidates",
    { p_event_id: eventId },
  );
  if (error) return [];
  return (data ?? []).map((candidate) => ({
    profileId: candidate.profile_id,
    displayName: candidate.display_name,
    ministryTitle: candidate.ministry_title,
    backgroundCheckStatus: candidate.background_check_status,
  }));
}

export async function listEventReminders(
  eventId: string,
): Promise<EventReminder[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("list_event_reminders", {
    p_event_id: eventId,
  });
  if (error) return [];
  return (data ?? []).map((reminder) => ({
    reminderId: reminder.reminder_id,
    title: reminder.title,
    remindAt: reminder.remind_at,
    reminderStatus: reminder.reminder_status,
    notes: reminder.notes,
  }));
}

export async function createEventReminder(input: {
  eventId: string;
  title: string;
  remindAt: string;
  notes: string | null;
}) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("create_event_reminder", {
    p_event_id: input.eventId,
    p_title: input.title,
    p_remind_at: input.remindAt,
    p_notes: input.notes,
  });
  return error
    ? { success: false as const, message: error.message }
    : { success: true as const };
}

export async function setEventReminderStatus(
  reminderId: string,
  status: "scheduled" | "completed" | "cancelled",
) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_event_reminder_status", {
    p_reminder_id: reminderId,
    p_status: status,
  });
  return !error;
}

export async function listEventChecklistItems(
  eventId: string,
): Promise<EventChecklistItem[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("list_event_checklist_items", {
    p_event_id: eventId,
  });
  if (error) return [];
  return (data ?? []).map((item) => ({
    checklistItemId: item.checklist_item_id,
    title: item.title,
    notes: item.notes,
    dueAt: item.due_at,
    sortOrder: item.sort_order,
    isCompleted: item.is_completed,
  }));
}

export async function createEventChecklistItem(input: {
  eventId: string;
  title: string;
  notes: string | null;
  dueAt: string | null;
}) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("create_event_checklist_item", {
    p_event_id: input.eventId,
    p_title: input.title,
    p_notes: input.notes,
    p_due_at: input.dueAt,
  });
  return error
    ? { success: false as const, message: error.message }
    : { success: true as const };
}

export async function setEventChecklistItemCompleted(
  checklistItemId: string,
  isCompleted: boolean,
) {
  const supabase = await createClient();
  const { error } = await supabase.rpc(
    "set_event_checklist_item_completed",
    {
      p_checklist_item_id: checklistItemId,
      p_is_completed: isCompleted,
    },
  );
  return !error;
}
