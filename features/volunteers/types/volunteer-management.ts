import type {
  AccountRole,
  BackgroundCheckStatus,
  VolunteerCertificationStatus,
  VolunteerSkillLevel,
} from "@/lib/supabase/database.types";

export type VolunteerActionState = {
  success: boolean;
  message?: string;
};

export type VolunteerSkill = {
  id: string;
  name: string;
  level?: VolunteerSkillLevel;
};

export type VolunteerDirectoryEntry = {
  profileId: string;
  displayName: string;
  primaryRole: AccountRole;
  ministryTitle: string | null;
  backgroundCheckStatus: BackgroundCheckStatus;
  backgroundCheckExpiresAt: string | null;
  isActive: boolean;
  skills: VolunteerSkill[];
};

export type VolunteerWorkspace = {
  profileId: string;
  displayName: string;
  primaryRole: AccountRole;
  ministryTitle: string | null;
  backgroundCheckStatus: BackgroundCheckStatus;
  backgroundCheckCompletedAt: string | null;
  backgroundCheckExpiresAt: string | null;
  backgroundCheckReference: string | null;
  isActive: boolean;
  canManage: boolean;
  certifications: {
    id: string;
    name: string;
    issuer: string | null;
    issuedAt: string | null;
    expiresAt: string | null;
    status: VolunteerCertificationStatus;
    reference: string | null;
  }[];
  skills: {
    assignmentId: string;
    skillId: string;
    name: string;
    level: VolunteerSkillLevel;
    notes: string | null;
  }[];
  availability: {
    id: string;
    dayOfWeek: number;
    startsAt: string;
    endsAt: string;
    timezone: string;
    effectiveFrom: string;
    effectiveUntil: string | null;
    notes: string | null;
  }[];
};

export type VolunteerAssignment = {
  assignmentId: string;
  eventId: string;
  eventName: string;
  eventStatus: string;
  eventStartsAt: string;
  eventEndsAt: string;
  eventTimezone: string;
  assignmentRole: string;
  assignmentStatus: string;
  assignmentStartsAt: string | null;
  assignmentEndsAt: string | null;
};

export type SchedulableEvent = {
  eventId: string;
  eventName: string;
  eventStatus: string;
  startsAt: string;
  endsAt: string;
  timezone: string;
};
