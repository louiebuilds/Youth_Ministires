import "server-only";

import {
  getMyUnreadNotificationCount,
  listAnnouncements,
} from "@/features/communications/services/communication-service";
import { listMyCustomForms } from "@/features/forms/services/custom-form-service";
import {
  getOwnActiveVolunteerProfile,
  listVolunteerAssignments,
} from "@/features/volunteers/services/volunteer-management-service";

import type { VolunteerDashboardData } from "@/features/dashboard/types/volunteer-dashboard";

const audienceLabels = {
  event: "Event volunteers",
  household: "Household",
  individual: "For you",
  ministry: "Entire ministry",
  parents: "Parents and guardians",
  volunteers: "Volunteers",
} as const;

export async function getVolunteerDashboardData(
  profileId: string,
): Promise<VolunteerDashboardData> {
  const [profile, announcements, customForms, unreadNotifications] =
    await Promise.all([
      getOwnActiveVolunteerProfile(profileId),
      listAnnouncements(null, false),
      listMyCustomForms(),
      getMyUnreadNotificationCount(),
    ]);
  const assignments = profile
    ? await listVolunteerAssignments(profile.profileId)
    : [];

  return {
    volunteerProfileId: profile?.profileId ?? null,
    unreadNotifications,
    formsNeedingAttention: customForms.filter((form) =>
      form.submissionStatus !== "submitted" && form.submissionStatus !== "archived"
    ).length,
    assignments: assignments
      .filter((assignment) => !assignment.isPast && !["cancelled", "declined"].includes(assignment.assignmentStatus))
      .slice(0, 6)
      .map((assignment) => ({
        assignmentId: assignment.assignmentId,
        eventName: assignment.eventName,
        role: assignment.assignmentRole,
        startsAt: assignment.assignmentStartsAt ?? assignment.eventStartsAt,
        status: assignment.assignmentStatus,
        timezone: assignment.eventTimezone,
      })),
    announcements: announcements.success
      ? announcements.announcements.slice(0, 4).map((announcement) => ({
          announcementId: announcement.announcementId,
          title: announcement.title,
          audienceLabel: audienceLabels[announcement.audienceType],
          publishedAt: announcement.publishedAt ?? announcement.createdAt,
        }))
      : [],
  };
}
