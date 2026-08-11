export type ScheduleStatus = "draft" | "published" | "cancelled" | "completed";
export type RotationStatus = "active" | "paused" | "ended";
export type RecurrencePattern = "weekly" | "biweekly" | "monthly";
export type SchedulingActionState = { success: boolean; message: string };

export type ScheduleRow = {
  scheduleId: string; scheduleName: string; ministryContext: string | null;
  eventId: string | null; status: ScheduleStatus; startsAt: string; endsAt: string;
  timezone: string; notes: string | null; positionId: string | null;
  responsibility: string | null; requiredCount: number | null; locationId: string | null;
  locationName: string | null; assignmentId: string | null; profileId: string | null;
  volunteerName: string | null; assignmentStatus: string | null;
  conflictCodes: string[]; conflictOverridden: boolean;
};
export type SchedulingCandidate = { profileId: string; displayName: string };
export type Rotation = { id: string; name: string; recurrencePattern: RecurrencePattern; weekday: number | null; monthlyOrdinal: number | null; startsOn: string; endsOn: string | null; startsAt: string; endsAt: string; timezone: string; scheduleName: string; ministryContext: string | null; responsibility: string; locationName: string | null; profileId: string | null; status: RotationStatus };
