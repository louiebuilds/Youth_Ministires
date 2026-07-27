import type { CheckInStatus } from "@/lib/supabase/database.types";

export type CheckInEvent = {
  eventId: string;
  eventName: string;
  startsAt: string;
  endsAt: string;
  timezone: string;
};

export type HouseholdSearchResult = {
  householdId: string;
  householdName: string;
  studentCount: number;
};

export type CheckInStudent = {
  studentId: string;
  displayName: string;
  grade: string;
  medicalSummary: string | null;
  allergySummary: string | null;
  dietarySummary: string | null;
  checkInStatus: CheckInStatus | null;
};

export type AuthorizedPickup = {
  personId: string;
  displayName: string;
  relationshipType: string;
  studentId: string;
};

export type CheckInHousehold = {
  householdId: string;
  householdName: string;
  students: CheckInStudent[];
  pickups: AuthorizedPickup[];
};

export type EmergencyRosterEntry = {
  checkInId: string;
  studentId: string;
  displayName: string;
  householdName: string;
  checkedInAt: string;
  hasCareAlert: boolean;
  emergencyContact: string | null;
};

export type CheckedInVisitor = {
  visitorId: string;
  displayName: string;
  grade: string | null;
  guardianName: string;
  guardianContact: string;
  checkedInAt: string;
};

export type CheckInActionState = {
  success: boolean;
  message?: string;
  token?: string;
};
