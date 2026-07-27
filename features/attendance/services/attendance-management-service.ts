import "server-only";

import { createClient } from "@/lib/supabase/server";

import type {
  AttendanceEvent,
  AttendanceRosterEntry,
  AttendanceSession,
} from "@/features/attendance/types/attendance-management";
import type { AttendanceStatus } from "@/lib/supabase/database.types";

export async function listAttendanceEvents(): Promise<AttendanceEvent[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("list_attendance_events");
  if (error) return [];
  return (data ?? []).map((item) => ({
    eventId: item.event_id, eventName: item.event_name,
    eventStatus: item.event_status, startsAt: item.starts_at,
    endsAt: item.ends_at, timezone: item.timezone,
  }));
}

export async function listAttendanceSessions(): Promise<AttendanceSession[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("list_attendance_sessions");
  if (error) return [];
  return (data ?? []).map((item) => ({
    sessionId: item.session_id, eventId: item.event_id,
    eventName: item.event_name, sessionDate: item.session_date,
    className: item.class_name, startsAt: item.starts_at,
    endsAt: item.ends_at, finalizedAt: item.finalized_at,
    presentCount: Number(item.present_count),
    absentCount: Number(item.absent_count),
    excusedCount: Number(item.excused_count),
    pendingCount: Number(item.pending_count),
  }));
}

export async function createAttendanceSession(input: {
  eventId: string; sessionDate: string; className: string;
  startsAt: string | null; endsAt: string | null;
}) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_attendance_session", {
    p_event_id: input.eventId, p_session_date: input.sessionDate,
    p_class_name: input.className, p_starts_at: input.startsAt,
    p_ends_at: input.endsAt,
  });
  return error || !data
    ? { success: false as const }
    : { success: true as const, sessionId: data };
}

export async function listAttendanceRoster(
  sessionId: string,
  search: string | null,
): Promise<AttendanceRosterEntry[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("list_attendance_roster", {
    p_session_id: sessionId, p_search: search,
  });
  if (error) return [];
  return (data ?? []).map((item) => ({
    studentId: item.student_id, displayName: item.display_name,
    householdName: item.household_name, grade: item.grade,
    studentStatus: item.student_status,
    attendanceRecordId: item.attendance_record_id,
    attendanceStatus: item.attendance_status, notes: item.notes,
    correctedAt: item.corrected_at,
  }));
}

export async function saveAttendanceRecord(input: {
  sessionId: string; studentId: string;
  status: AttendanceStatus; notes: string | null;
}) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("save_attendance_record", {
    p_session_id: input.sessionId, p_student_id: input.studentId,
    p_status: input.status, p_notes: input.notes,
  });
  return !error;
}

export async function finalizeAttendanceSession(sessionId: string) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("finalize_attendance_session", {
    p_session_id: sessionId,
  });
  return !error;
}
