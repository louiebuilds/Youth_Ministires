import "server-only";

import { createClient } from "@/lib/supabase/server";

import type {
  AttendanceSessionReport,
  CheckInEventReport,
} from "@/features/attendance/types/attendance-reports";

export async function listAttendanceSessionReports(
  fromDate: string,
  toDate: string,
): Promise<AttendanceSessionReport[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc(
    "list_attendance_report_sessions",
    { p_from_date: fromDate, p_to_date: toDate },
  );
  if (error) return [];
  return (data ?? []).map((row) => ({
    sessionId: row.session_id,
    sessionDate: row.session_date,
    eventName: row.event_name,
    className: row.class_name,
    finalizedAt: row.finalized_at,
    presentCount: Number(row.present_count),
    absentCount: Number(row.absent_count),
    excusedCount: Number(row.excused_count),
    pendingCount: Number(row.pending_count),
  }));
}

export async function listCheckInEventReports(
  fromDate: string,
  toDate: string,
): Promise<CheckInEventReport[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("list_checkin_report_events", {
    p_from_date: fromDate,
    p_to_date: toDate,
  });
  if (error) return [];
  return (data ?? []).map((row) => ({
    eventId: row.event_id,
    eventName: row.event_name,
    startsAt: row.starts_at,
    checkedInCount: Number(row.checked_in_count),
    checkedOutCount: Number(row.checked_out_count),
    exceptionCount: Number(row.exception_count),
    visitorCount: Number(row.visitor_count),
    visitorCheckedOutCount: Number(row.visitor_checked_out_count),
  }));
}
