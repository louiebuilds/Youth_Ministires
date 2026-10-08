import "server-only";

import { listAnnouncements } from "@/features/communications/services/communication-service";
import { listEventCalendar, listMyEventRegistrationOptions } from "@/features/events/services/event-management-service";
import { listMyCustomForms } from "@/features/forms/services/custom-form-service";
import { listAvailableDocumentVersions, listDocumentSubmissions } from "@/features/forms/services/document-submission-service";
import { getFamilyWorkspace, listAccessibleFamilies } from "@/features/members/services/family-directory-service";
import { getOwnActiveVolunteerProfile, listVolunteerAssignments } from "@/features/volunteers/services/volunteer-management-service";

import type { ParentDashboardData } from "@/features/dashboard/types/parent-dashboard";

const activeRegistrationStatuses = new Set([
  "registered",
  "waitlisted",
  "confirmed",
  "completed",
]);

const audienceLabels = {
  event: "Event families",
  household: "Your household",
  individual: "For you",
  ministry: "Entire ministry",
  parents: "Parents and guardians",
  volunteers: "Volunteers",
} as const;

export async function getParentDashboardData(
  profileId: string,
): Promise<ParentDashboardData> {
  const today = new Date();
  const through = new Date(today);
  through.setUTCDate(through.getUTCDate() + 90);

  const [familyResult, calendarResult, availableDocuments, submissions, customForms, announcementResult, volunteerProfile] =
    await Promise.all([
      listAccessibleFamilies(null),
      listEventCalendar({
        fromDate: today.toISOString().slice(0, 10),
        toDate: through.toISOString().slice(0, 10),
        search: null,
        status: null,
      }),
      listAvailableDocumentVersions(),
      listDocumentSubmissions(),
      listMyCustomForms(),
      listAnnouncements(null, false),
      getOwnActiveVolunteerProfile(profileId),
    ]);

  const accessibleFamilies = familyResult.success ? familyResult.families : [];
  const familyWorkspaces = await Promise.all(
    accessibleFamilies.map((family) => getFamilyWorkspace(family.householdId)),
  );
  const families = accessibleFamilies.map((family, index) => {
    const workspace = familyWorkspaces[index];
    return {
      householdId: family.householdId,
      householdName: family.householdName,
      children: workspace.success
        ? workspace.family.children.map((child) => ({
            studentId: child.id,
            displayName: child.displayName,
            grade: child.grade,
          }))
        : [],
    };
  });

  const visibleEvents = calendarResult.success ? calendarResult.events : [];
  const eventOptions = await Promise.all(
    visibleEvents.map((event) => listMyEventRegistrationOptions(event.eventId)),
  );
  const upcomingEvents = visibleEvents.flatMap((event, index) => {
    const registrations = eventOptions[index]
      .filter((option) => option.registrationStatus && activeRegistrationStatuses.has(option.registrationStatus))
      .map((option) => ({
        studentName: option.studentName,
        status: option.registrationStatus ?? "registered",
      }));

    return registrations.length > 0
      ? [{
          eventId: event.eventId,
          eventName: event.eventName,
          startsAt: event.startsAt,
          timezone: event.timezone,
          registrations,
        }]
      : [];
  }).slice(0, 5);

  const currentSubmissions = submissions.filter((submission) =>
    !submission.isSuperseded && submission.lifecycleStatus !== "archived"
  );
  const documentAttention = availableDocuments.filter((document) => {
    const submission = currentSubmissions.find((candidate) =>
      candidate.studentId === document.studentId &&
      candidate.templateVersionId === document.templateVersionId
    );
    return !submission || submission.digitalStatus === "missing" ||
      submission.digitalStatus === "needs_replacement" ||
      submission.reviewState === "rejected" ||
      submission.reviewState === "replacement_requested";
  }).map((document) => ({
    title: document.templateName,
    detail: `${document.studentName} · ${document.documentKind === "medical_release" ? "Medical release" : "Permission form"}`,
    href: "/permission-forms?view=medical",
  }));
  const customFormAttention = customForms.filter((form) =>
    form.submissionStatus !== "submitted" && form.submissionStatus !== "archived"
  ).map((form) => ({
    title: form.title,
    detail: form.subjectStudentId ? "Form assigned for a linked child" : "Form assigned to your household",
    href: `/permission-forms/my/${form.assignmentId}`,
  }));

  const volunteerAssignments = volunteerProfile
    ? await listVolunteerAssignments(volunteerProfile.profileId)
    : [];

  return {
    families,
    upcomingEvents,
    attentionItems: [...documentAttention, ...customFormAttention].slice(0, 6),
    announcements: announcementResult.success
      ? announcementResult.announcements.slice(0, 3).map((announcement) => ({
          announcementId: announcement.announcementId,
          title: announcement.title,
          audienceLabel: audienceLabels[announcement.audienceType],
          publishedAt: announcement.publishedAt ?? announcement.createdAt,
        }))
      : [],
    volunteer: volunteerProfile
      ? {
          profileId: volunteerProfile.profileId,
          assignments: volunteerAssignments
            .filter((assignment) => !assignment.isPast && !["cancelled", "declined"].includes(assignment.assignmentStatus))
            .slice(0, 3)
            .map((assignment) => ({
              assignmentId: assignment.assignmentId,
              eventName: assignment.eventName,
              role: assignment.assignmentRole,
              startsAt: assignment.assignmentStartsAt ?? assignment.eventStartsAt,
              status: assignment.assignmentStatus,
              timezone: assignment.eventTimezone,
            })),
        }
      : null,
  };
}
