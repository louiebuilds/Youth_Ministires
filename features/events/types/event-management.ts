import type { EventStatus } from "@/lib/supabase/database.types";

export type EventActionState = { success: boolean; message?: string };

export type EventCalendarEntry = {
  eventId: string;
  eventName: string;
  eventType: string;
  eventStatus: EventStatus;
  startsAt: string;
  endsAt: string;
  timezone: string;
  capacity: number | null;
  campus: string | null;
  building: string | null;
  room: string | null;
  canManage: boolean;
};

export type EventWorkspace = {
  eventId: string;
  name: string;
  eventType: string;
  status: EventStatus;
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
  canManage: boolean;
};

export type EventRegistrationSettings = {
  eventId: string;
  capacity: number | null;
  waitlistCapacity: number | null;
  registrationOpensAt: string | null;
  registrationClosesAt: string | null;
  registeredCount: number;
  waitlistedCount: number;
  canManage: boolean;
};
export type EventRegistrationStatus =
  | "draft"
  | "registered"
  | "waitlisted"
  | "confirmed"
  | "cancelled"
  | "completed";

export type EventRegistrationOption = {
  studentId: string;
  studentName: string;
  householdId: string;
  householdName: string;
  registrationId: string | null;
  registrationStatus: EventRegistrationStatus | null;
};

export type ManagedEventRegistration = {
  registrationId: string;
  studentId: string;
  studentName: string;
  householdName: string;
  registrationStatus: EventRegistrationStatus;
  waitlistPosition: number | null;
  createdAt: string;
};

export type DocumentRequirementReadiness = {
  requirementId: string | null;
  templateVersionId: string | null;
  templateName: string;
  documentKind: "permission_slip" | "medical_release";
  configured?: boolean;
  schoolYearStart?: string;
  ready: boolean;
  blocksParticipation: boolean;
  missing: string[];
};

export type EventRegistrationReadiness = {
  registrationId: string;
  studentId: string;
  documentationReady: boolean;
  requirements: DocumentRequirementReadiness[];
  participationOverrideId: string | null;
};

export type EventVolunteerAssignment = {
  assignmentId: string;
  profileId: string;
  displayName: string;
  assignmentRole: string;
  assignmentStatus:
    | "assigned"
    | "confirmed"
    | "declined"
    | "cancelled"
    | "completed";
  assignmentStartsAt: string | null;
  assignmentEndsAt: string | null;
};

export type EventVolunteerCandidate = {
  profileId: string;
  displayName: string;
  ministryTitle: string | null;
  backgroundCheckStatus:
    | "not_required"
    | "pending"
    | "cleared"
    | "review_required"
    | "expired";
};

export type EventReminder = {
  reminderId: string;
  title: string;
  remindAt: string;
  reminderStatus: "scheduled" | "completed" | "cancelled";
  notes: string | null;
};

export type EventChecklistItem = {
  checklistItemId: string;
  title: string;
  notes: string | null;
  dueAt: string | null;
  sortOrder: number;
  isCompleted: boolean;
};
