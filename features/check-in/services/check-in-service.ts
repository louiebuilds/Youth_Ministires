import "server-only";

import { createClient } from "@/lib/supabase/server";

import type {
  CheckInEvent,
  CheckInHousehold,
  CheckedInVisitor,
  EmergencyRosterEntry,
  HouseholdSearchResult,
} from "@/features/check-in/types/check-in";

export async function listCheckInEvents(): Promise<CheckInEvent[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("list_checkin_events");
  if (error) return [];
  return (data ?? []).map((event) => ({
    eventId: event.event_id,
    eventName: event.event_name,
    startsAt: event.starts_at,
    endsAt: event.ends_at,
    timezone: event.timezone,
  }));
}

export async function searchCheckInHouseholds(
  eventId: string,
  search: string,
): Promise<HouseholdSearchResult[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("search_checkin_households", {
    p_event_id: eventId,
    p_search: search,
  });
  if (error) return [];
  return (data ?? []).map((household) => ({
    householdId: household.household_id,
    householdName: household.household_name,
    studentCount: Number(household.student_count),
  }));
}

export async function getCheckInHousehold(
  eventId: string,
  householdId: string,
): Promise<CheckInHousehold | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_checkin_household", {
    p_event_id: eventId,
    p_household_id: householdId,
  });
  if (error || !data || Array.isArray(data) || typeof data !== "object") return null;
  return data as CheckInHousehold;
}

export async function listEmergencyRoster(
  eventId: string,
): Promise<EmergencyRosterEntry[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("list_emergency_roster", {
    p_event_id: eventId,
  });
  if (error) return [];
  return (data ?? []).map((entry) => ({
    checkInId: entry.check_in_id,
    studentId: entry.student_id,
    displayName: entry.display_name,
    householdName: entry.household_name,
    checkedInAt: entry.checked_in_at,
    hasCareAlert: entry.medical_alert,
    emergencyContact: entry.emergency_contact,
  }));
}

export async function listCheckedInVisitors(
  eventId: string,
): Promise<CheckedInVisitor[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("list_checked_in_visitors", {
    p_event_id: eventId,
  });
  if (error) return [];
  return (data ?? []).map((entry) => ({
    visitorId: entry.visitor_id,
    displayName: entry.display_name,
    grade: entry.grade,
    guardianName: entry.guardian_name,
    guardianContact: entry.guardian_contact,
    checkedInAt: entry.checked_in_at,
  }));
}

async function rpcSucceeded(
  name: "check_in_student" | "check_out_student" | "check_in_visitor" |
    "check_out_visitor" | "correct_student_check_in",
  args: Record<string, string | null>,
) {
  const supabase = await createClient();
  const { error } = await supabase.rpc(name, args as never);
  return !error;
}

export async function checkInStudent(eventId: string, studentId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("check_in_student", {
    p_event_id: eventId, p_student_id: studentId,
  });
  return !error && data !== null;
}

export const checkOutStudent = (
  eventId: string, studentId: string,
  pickupPersonId: string | null, overrideReason: string | null,
) => rpcSucceeded("check_out_student", {
  p_event_id: eventId, p_student_id: studentId,
  p_pickup_person_id: pickupPersonId, p_override_reason: overrideReason,
});

export const correctStudentCheckIn = (
  eventId: string, studentId: string, reason: string,
) => rpcSucceeded("correct_student_check_in", {
  p_event_id: eventId, p_student_id: studentId, p_reason: reason,
});

export const checkInVisitor = (input: {
  eventId: string; firstName: string; lastName: string; grade: string | null;
  guardianName: string; guardianContact: string;
}) => rpcSucceeded("check_in_visitor", {
  p_event_id: input.eventId, p_first_name: input.firstName,
  p_last_name: input.lastName, p_grade: input.grade,
  p_guardian_name: input.guardianName,
  p_guardian_contact: input.guardianContact,
});

export const checkOutVisitor = (visitorId: string) =>
  rpcSucceeded("check_out_visitor", { p_visitor_id: visitorId });

export async function issueFamilyToken(householdId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("issue_family_checkin_token", {
    p_household_id: householdId,
  });
  return error ? null : data;
}

export async function resolveFamilyToken(eventId: string, token: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("resolve_family_checkin_token", {
    p_event_id: eventId, p_token: token,
  });
  return error || !data
    ? { success: false as const, code: error?.code ?? "unknown" }
    : { success: true as const, householdId: data };
}
