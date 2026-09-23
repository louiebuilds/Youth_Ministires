import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";

import { requireCapability } from "@/features/auth/services/authorization-service";
import {
  VolunteerAssignmentsSection,
  VolunteerAvailabilitySection,
  VolunteerComplianceSection,
  VolunteerOverview,
  VolunteerSkillsSection,
  VolunteerWorkspaceNavigation,
  volunteerSections,
} from "@/features/volunteers/components/volunteer-workspace-sections";
import {
  getVolunteerWorkspace,
  listSchedulableEvents,
  listVolunteerAssignments,
  listVolunteerSkills,
} from "@/features/volunteers/services/volunteer-management-service";

import type { VolunteerSection } from "@/features/volunteers/components/volunteer-workspace-sections";

export const metadata: Metadata = { title: "Volunteer workspace" };

const sectionSchema = z.enum(volunteerSections.map(({ id }) => id));

export default async function VolunteerWorkspacePage({
  params,
  searchParams,
}: Readonly<{
  params: Promise<{ profileId: string }>;
  searchParams: Promise<{ section?: string | string[] }>;
}>) {
  const account = await requireCapability("volunteers.view");

  const parsed = z.string().uuid().safeParse((await params).profileId);

  if (
    !parsed.success ||
    (account.role === "volunteer" && account.id !== parsed.data)
  ) {
    notFound();
  }

  const result = await getVolunteerWorkspace(parsed.data);

  if (!result.success) {
    notFound();
  }

  const volunteer = result.volunteer;

  /*
   * A Volunteer may view their own Volunteer workspace, but must never receive
   * manager-only controls.
   *
   * Preserve the backend canManage decision for every other role while
   * explicitly enforcing Volunteer self-service behavior at the page boundary.
   */
  const viewerCanManage =
    account.role === "volunteer" ? false : volunteer.canManage;

  const volunteerForViewer = {
    ...volunteer,
    canManage: viewerCanManage,
  };

  const requested = sectionSchema.safeParse((await searchParams).section);

  const activeSection: VolunteerSection = requested.success
    ? requested.data
    : "overview";

  const needsAssignments =
    activeSection === "overview" || activeSection === "assignments";

  const [skills, assignments, events] = await Promise.all([
    activeSection === "skills"
      ? listVolunteerSkills()
      : Promise.resolve([]),

    needsAssignments
      ? listVolunteerAssignments(volunteer.profileId)
      : Promise.resolve([]),

    activeSection === "assignments" && viewerCanManage
      ? listSchedulableEvents()
      : Promise.resolve([]),
  ]);

  return (
    <div className="space-y-7">
      <header>
        <Link
          className="text-sm font-semibold text-sky-700 hover:text-sky-900"
          href="/volunteers"
        >
          ← Back to volunteers
        </Link>

        <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-950">
              {volunteer.displayName}
            </h1>

            <p className="mt-2 text-base text-slate-600">
              {volunteer.ministryTitle ?? "Volunteer"} ·{" "}
              {volunteer.primaryRole.replaceAll("_", " ")}
            </p>
          </div>

          <span
            className={`rounded-full px-3 py-1.5 text-sm font-semibold ${
              volunteer.isActive
                ? "bg-emerald-100 text-emerald-800"
                : "bg-slate-100 text-slate-700"
            }`}
          >
            {volunteer.isActive ? "Active" : "Inactive"}
          </span>
        </div>
      </header>

      <VolunteerWorkspaceNavigation
        active={activeSection}
        profileId={volunteer.profileId}
      />

      {activeSection === "overview" ? (
        <VolunteerOverview
          assignments={assignments}
          volunteer={volunteerForViewer}
        />
      ) : null}

      {activeSection === "compliance" ? (
        <VolunteerComplianceSection volunteer={volunteerForViewer} />
      ) : null}

      {activeSection === "skills" ? (
        <VolunteerSkillsSection
          skills={skills}
          volunteer={volunteerForViewer}
        />
      ) : null}

      {activeSection === "availability" ? (
        <VolunteerAvailabilitySection volunteer={volunteerForViewer} />
      ) : null}

      {activeSection === "assignments" ? (
        <VolunteerAssignmentsSection
          assignments={assignments}
          events={events}
          volunteer={volunteerForViewer}
        />
      ) : null}
    </div>
  );
}