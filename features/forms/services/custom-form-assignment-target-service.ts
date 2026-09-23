import "server-only";

import { listAccessibleFamilies } from "@/features/members/services/family-directory-service";
import { listMemberDirectory } from "@/features/members/services/member-directory-service";
import { listSchedulableEvents, listVolunteerDirectory } from "@/features/volunteers/services/volunteer-management-service";

import type { CustomFormAssignmentTargets } from "@/features/forms/types/custom-forms";

export async function listCustomFormAssignmentTargets(): Promise<CustomFormAssignmentTargets> {
  const [events, students, households, volunteers] = await Promise.all([
    listSchedulableEvents(),
    listMemberDirectory({ search: null, status: "active", grade: null, tagId: null }),
    listAccessibleFamilies(null),
    listVolunteerDirectory(null),
  ]);

  return {
    events: events
      .filter((event) => event.eventStatus === "published" || event.eventStatus === "active")
      .map((event) => ({ id: event.eventId, label: event.eventName })),
    students: students.success
      ? students.members.map((student) => ({ id: student.studentId, label: `${student.displayName} · ${student.householdName}` }))
      : [],
    households: households.success
      ? households.families.filter((household) => household.status === "active").map((household) => ({ id: household.householdId, label: household.householdName }))
      : [],
    volunteers: volunteers.success
      ? volunteers.volunteers.filter((volunteer) => volunteer.isActive).map((volunteer) => ({ id: volunteer.profileId, label: volunteer.displayName }))
      : [],
  };
}