import type {
  AttendanceStatus,
  EventStatus,
  StudentStatus,
} from "@/lib/supabase/database.types";

export type AttendanceActionState = { success: boolean; message?: string };

export type AttendanceEvent = {
  eventId: string;
  eventName: string;
  eventStatus: EventStatus;
  startsAt: string;
  endsAt: string;
  timezone: string;
};

export type AttendanceSession = {
  sessionId: string;
  eventId: string;
  eventName: string;
  sessionDate: string;
  className: string;
  startsAt: string | null;
  endsAt: string | null;
  finalizedAt: string | null;
  presentCount: number;
  absentCount: number;
  excusedCount: number;
  pendingCount: number;
};

export type AttendanceRosterEntry = {
  studentId: string;
  displayName: string;
  householdName: string;
  grade: string;
  studentStatus: StudentStatus;
  attendanceRecordId: string | null;
  attendanceStatus: AttendanceStatus;
  notes: string | null;
  correctedAt: string | null;
};
