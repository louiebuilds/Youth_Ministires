export type ReportType =
  | "overview" | "attendance" | "events" | "volunteers" | "growth" | "ministry_health";

export type ReportingRange = { fromDate: string; toDate: string };

export type ReportingOverview = ReportingRange & {
  attendanceCount: number; uniqueYouth: number; firstTimeParticipants: number;
  firstTimeVisitorActivity: number; activeYouth: number; newYouthAdded: number;
  activeHouseholds: number; newHouseholds: number; eventAttendance: number;
  upcomingEvents: number; registrations: number; requiredPositions: number;
  filledPositions: number; unfilledPositions: number; coveragePercentage: number;
  upcomingAssignments: number;
};

export type AttendanceTrend = { bucketStart: string; attendanceCount: number; uniqueYouth: number };

export type EventReportRow = {
  eventId: string; eventName: string; eventType: string; startsAt: string;
  capacity: number | null; registeredCount: number; waitlistedCount: number;
  cancelledCount: number; attendanceCount: number; capacityUtilization: number | null;
  volunteerStaffing: number;
};
export type EventParticipationTrend = { bucketStart:string;registrationCount:number;attendanceCount:number };

export type VolunteerActivityRow = {
  source: "scheduling" | "legacy_event"; assignmentId: string; profileId: string;
  volunteerName: string; responsibility: string; assignmentStatus: string;
  startsAt: string; eventName: string;
};

export type CoverageRow = {
  scheduleId: string; scheduleName: string; startsAt: string; scheduleStatus: string;
  requiredPositions: number; filledPositions: number; unfilledPositions: number;
  coveragePercentage: number;
};

export type SavedReport = {
  id: string; name: string; reportType: ReportType;
  configuration: Record<string, unknown>; createdAt: string; updatedAt: string;
};

export type ReportingData = {
  overview: ReportingOverview; weeklyTrends: AttendanceTrend[];
  monthlyTrends: AttendanceTrend[]; events: EventReportRow[];
  eventTrends: EventParticipationTrend[];
  volunteerActivity: VolunteerActivityRow[]; coverage: CoverageRow[];
  savedReports: SavedReport[];
};
