import "server-only";

import { createClient } from "@/lib/supabase/server";

import type {
  SchedulableEvent,
  VolunteerAssignment,
  VolunteerDirectoryEntry,
  VolunteerWorkspace,
} from "@/features/volunteers/types/volunteer-management";
import type {
  BackgroundCheckStatus,
  VolunteerCertificationStatus,
  VolunteerSkillLevel,
} from "@/lib/supabase/database.types";

const parseSkills = (value: unknown) =>
  Array.isArray(value)
    ? value.flatMap((skill) =>
        skill && typeof skill === "object" && "id" in skill &&
        "name" in skill && typeof skill.id === "string" &&
        typeof skill.name === "string"
          ? [{ id: skill.id, name: skill.name }]
          : [],
      )
    : [];

export async function listVolunteerDirectory(search: string | null) {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("list_volunteer_directory", {
      p_search: search,
    });
    if (error) return { success: false as const };
    return {
      success: true as const,
      volunteers: (data ?? []).map((row): VolunteerDirectoryEntry => ({
        profileId: row.profile_id,
        displayName: row.display_name,
        primaryRole: row.primary_role,
        ministryTitle: row.ministry_title,
        backgroundCheckStatus: row.background_check_status,
        backgroundCheckExpiresAt: row.background_check_expires_at,
        isActive: row.is_active,
        skills: parseSkills(row.skills),
      })),
    };
  } catch {
    return { success: false as const };
  }
}

export async function listVolunteerCandidates() {
  const supabase = await createClient();
  const { data } = await supabase.rpc("list_volunteer_candidates");
  return data ?? [];
}

export async function listVolunteerSkills() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("volunteer_skills")
    .select("id, name, description")
    .order("name");
  return data ?? [];
}

export async function getVolunteerWorkspace(profileId: string) {
  try {
    const supabase = await createClient();
    const [headerResult, certifications, assignments, skillCatalog, availability] =
      await Promise.all([
        supabase.rpc("get_volunteer_workspace", { p_profile_id: profileId }),
        supabase.from("volunteer_certifications").select("*")
          .eq("profile_id", profileId).order("name"),
        supabase.from("volunteer_skill_assignments")
          .select("*")
          .eq("profile_id", profileId),
        supabase.from("volunteer_skills").select("id, name").order("name"),
        supabase.from("volunteer_availability").select("*")
          .eq("profile_id", profileId).order("day_of_week"),
      ]);
    if (headerResult.error || !headerResult.data ||
      certifications.error || assignments.error || skillCatalog.error ||
      availability.error) {
      return { success: false as const, reason: "unavailable" as const };
    }
    const header = headerResult.data as Record<string, unknown>;
    const workspace: VolunteerWorkspace = {
      profileId: String(header.profileId),
      displayName: String(header.displayName),
      primaryRole: header.primaryRole as VolunteerWorkspace["primaryRole"],
      ministryTitle: header.ministryTitle as string | null,
      backgroundCheckStatus:
        header.backgroundCheckStatus as BackgroundCheckStatus,
      backgroundCheckCompletedAt:
        header.backgroundCheckCompletedAt as string | null,
      backgroundCheckExpiresAt:
        header.backgroundCheckExpiresAt as string | null,
      backgroundCheckReference:
        header.backgroundCheckReference as string | null,
      isActive: Boolean(header.isActive),
      canManage: Boolean(header.canManage),
      certifications: (certifications.data ?? []).map((item) => ({
        id: item.id, name: item.name, issuer: item.issuer,
        issuedAt: item.issued_at, expiresAt: item.expires_at,
        status: item.status, reference: item.reference,
      })),
      skills: (assignments.data ?? []).flatMap((item) => {
        const skill = (skillCatalog.data ?? [])
          .find((candidate) => candidate.id === item.skill_id);
        return skill
          ? [{
              assignmentId: item.id, skillId: skill.id, name: skill.name,
              level: item.skill_level, notes: item.notes,
            }]
          : [];
      }),
      availability: (availability.data ?? []).map((item) => ({
        id: item.id, dayOfWeek: item.day_of_week,
        startsAt: item.starts_at.slice(0, 5),
        endsAt: item.ends_at.slice(0, 5), timezone: item.timezone,
        effectiveFrom: item.effective_from,
        effectiveUntil: item.effective_until, notes: item.notes,
      })),
    };
    return { success: true as const, volunteer: workspace };
  } catch {
    return { success: false as const, reason: "denied" as const };
  }
}

export async function saveVolunteerProfile(input: {
  profileId: string; ministryTitle: string | null;
  backgroundCheckStatus: BackgroundCheckStatus;
  backgroundCheckCompletedAt: string | null;
  backgroundCheckExpiresAt: string | null;
  backgroundCheckReference: string | null; isActive: boolean;
}) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("upsert_volunteer_profile", {
    p_profile_id: input.profileId, p_ministry_title: input.ministryTitle,
    p_background_check_status: input.backgroundCheckStatus,
    p_background_check_completed_at: input.backgroundCheckCompletedAt,
    p_background_check_expires_at: input.backgroundCheckExpiresAt,
    p_background_check_reference: input.backgroundCheckReference,
    p_is_active: input.isActive,
  });
  return !error;
}

export async function saveCertification(input: {
  id: string | null; profileId: string; name: string;
  issuer: string | null; issuedAt: string | null; expiresAt: string | null;
  status: VolunteerCertificationStatus; reference: string | null;
}) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("save_volunteer_certification", {
    p_id: input.id, p_profile_id: input.profileId, p_name: input.name,
    p_issuer: input.issuer, p_issued_at: input.issuedAt,
    p_expires_at: input.expiresAt, p_status: input.status,
    p_reference: input.reference,
  });
  return !error;
}

export async function createSkill(input: {
  name: string; description: string | null;
}) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("create_volunteer_skill", {
    p_name: input.name, p_description: input.description,
  });
  return !error;
}

export async function saveSkillAssignment(input: {
  profileId: string; skillId: string;
  skillLevel: VolunteerSkillLevel; notes: string | null;
}) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("save_volunteer_skill_assignment", {
    p_profile_id: input.profileId, p_skill_id: input.skillId,
    p_skill_level: input.skillLevel, p_notes: input.notes,
  });
  return !error;
}

export async function saveAvailability(input: {
  id: string | null; profileId: string; dayOfWeek: number;
  startsAt: string; endsAt: string; timezone: string; effectiveFrom: string;
  effectiveUntil: string | null; notes: string | null;
}) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("save_volunteer_availability", {
    p_id: input.id, p_profile_id: input.profileId,
    p_day_of_week: input.dayOfWeek, p_starts_at: input.startsAt,
    p_ends_at: input.endsAt, p_timezone: input.timezone,
    p_effective_from: input.effectiveFrom,
    p_effective_until: input.effectiveUntil, p_notes: input.notes,
  });
  return !error;
}

export async function listVolunteerAssignments(profileId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("list_volunteer_assignments", {
    p_profile_id: profileId,
  });
  if (error) return [] as VolunteerAssignment[];
  return (data ?? []).map((item): VolunteerAssignment => ({
    assignmentId: item.assignment_id, eventId: item.event_id,
    eventName: item.event_name, eventStatus: item.event_status,
    eventStartsAt: item.event_starts_at, eventEndsAt: item.event_ends_at,
    eventTimezone: item.event_timezone, assignmentRole: item.assignment_role,
    assignmentStatus: item.assignment_status,
    assignmentStartsAt: item.assignment_starts_at,
    assignmentEndsAt: item.assignment_ends_at,
  }));
}

export async function listSchedulableEvents() {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("list_schedulable_events");
  if (error) return [] as SchedulableEvent[];
  return (data ?? []).map((item): SchedulableEvent => ({
    eventId: item.event_id, eventName: item.event_name,
    eventStatus: item.event_status, startsAt: item.starts_at,
    endsAt: item.ends_at, timezone: item.timezone,
  }));
}

export async function scheduleVolunteer(input: {
  eventId: string; profileId: string; assignmentRole: string;
  startsAt: string | null; endsAt: string | null;
}) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("schedule_volunteer", {
    p_event_id: input.eventId, p_profile_id: input.profileId,
    p_assignment_role: input.assignmentRole,
    p_starts_at: input.startsAt, p_ends_at: input.endsAt,
  });
  return !error;
}

export async function setAssignmentStatus(
  assignmentId: string,
  status: "assigned" | "confirmed" | "declined" | "cancelled" | "completed",
) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_volunteer_assignment_status", {
    p_assignment_id: assignmentId, p_status: status,
  });
  return !error;
}
