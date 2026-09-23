export type ScheduleStatus = "draft" | "published" | "cancelled" | "completed";
export type ScheduleAssignmentStatus = "assigned" | "confirmed" | "declined" | "cancelled";
export type RotationStatus = "active" | "paused" | "ended";
export type RecurrencePattern = "weekly" | "biweekly" | "monthly";
export type SchedulingActionState = { success: boolean; message: string };

export type ScheduleRow = {
  scheduleId: string; scheduleName: string; ministryContext: string | null;
  eventId: string | null; status: ScheduleStatus; startsAt: string; endsAt: string;
  timezone: string; notes: string | null; positionId: string | null;
  responsibility: string | null; requiredCount: number | null; locationId: string | null;
  locationName: string | null; assignmentId: string | null; profileId: string | null;
  volunteerName: string | null; assignmentStatus: ScheduleAssignmentStatus | null;
  assignmentStartsAt: string | null; assignmentEndsAt: string | null;
  conflictCodes: string[]; conflictOverridden: boolean;
};
export type SchedulingCandidate = { profileId: string; displayName: string };
export type SchedulingEventOption = {
  eventId: string;
  eventName: string;
  eventStatus: string;
  startsAt: string;
  endsAt: string;
  timezone: string;
};
export type ScheduleConflictHistory = {
  assignmentId: string;
  positionId: string;
  volunteerName: string;
  responsibility: string;
  locationName: string | null;
  assignmentStatus: ScheduleAssignmentStatus;
  assignmentStartsAt: string;
  assignmentEndsAt: string;
  conflictCodes: string[];
  conflictOverridden: boolean;
  overrideReason: string | null;
};
export type Rotation = { id: string; name: string; recurrencePattern: RecurrencePattern; weekday: number | null; monthlyOrdinal: number | null; startsOn: string; endsOn: string | null; startsAt: string; endsAt: string; timezone: string; scheduleName: string; ministryContext: string | null; responsibility: string; locationName: string | null; profileId: string | null; status: RotationStatus };
