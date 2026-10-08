import type { Metadata } from "next";
import Link from "next/link";
import {
  notFound,
  redirect,
} from "next/navigation";
import { z } from "zod";

import { getAuthenticatedAccount } from "@/features/auth/services/session-service";
import { hasCapability } from "@/features/auth/types/authorization";
import {
  VolunteerAssignmentsSection,
  VolunteerAvailabilitySection,
  VolunteerOverview,
  VolunteerSkillsSection,
  VolunteerWorkspaceNavigation,
} from "@/features/volunteers/components/volunteer-workspace-sections";
import {
  getVolunteerWorkspace,
  listSchedulableEvents,
  listVolunteerAssignments,
  listVolunteerSkills,
} from "@/features/volunteers/services/volunteer-management-service";

import type { VolunteerSection } from "@/features/volunteers/components/volunteer-workspace-sections";

export const metadata: Metadata = {
  title: "Volunteer workspace",
};

const visibleVolunteerSections = [
  "overview",
  "skills",
  "availability",
  "assignments",
] as const;

const sectionSchema = z.enum(
  visibleVolunteerSections,
);

export default async function VolunteerWorkspacePage({
  params,
  searchParams,
}: Readonly<{
  params: Promise<{
    profileId: string;
  }>;
  searchParams: Promise<{
    section?: string | string[];
  }>;
}>) {
  const account =
    await getAuthenticatedAccount();

  if (!account) {
    redirect("/login");
  }

  const parsed = z
    .string()
    .uuid()
    .safeParse(
      (await params).profileId,
    );

  if (!parsed.success) {
    notFound();
  }

  const targetProfileId =
    parsed.data;

  const canViewVolunteerManagement =
    hasCapability(
      account.role,
      "volunteers.view",
    );

  const viewingOwnProfile =
    account.id === targetProfileId;

  /*
   * Users without volunteer-management access
   * may only attempt to open their own workspace.
   */
  if (
    !canViewVolunteerManagement &&
    !viewingOwnProfile
  ) {
    notFound();
  }

  /*
   * Permanent Volunteer accounts are also
   * self-service only.
   */
  if (
    account.role === "volunteer" &&
    !viewingOwnProfile
  ) {
    notFound();
  }

  const result =
    await getVolunteerWorkspace(
      targetProfileId,
    );

  if (!result.success) {
    notFound();
  }

  /*
   * When someone is viewing their own volunteer
   * workspace, use their editable account display
   * name from the authenticated profile.
   *
   * Manager views of another volunteer keep the
   * existing volunteer/person display name.
   */
  const volunteer = {
    ...result.volunteer,
    displayName: viewingOwnProfile
      ? account.displayName
      : result.volunteer.displayName,
  };

  /*
   * Parent + Volunteer:
   *
   * A Parent keeps the Parent primary role,
   * but may use Volunteer self-service when
   * an active volunteer profile exists for
   * their own account.
   */
  if (
    account.role === "parent" &&
    (!viewingOwnProfile ||
      !volunteer.isActive)
  ) {
    notFound();
  }

  /*
   * Volunteers and Parent+Volunteer users must
   * never receive manager-only controls.
   *
   * Administrator / Youth Pastor / Staff Member
   * retain the backend canManage decision.
   */
  const viewerCanManage =
    account.role !== "volunteer" &&
    account.role !== "parent" &&
    volunteer.canManage;

  const volunteerForViewer = {
    ...volunteer,
    canManage: viewerCanManage,
  };

  const requested =
    sectionSchema.safeParse(
      (await searchParams).section,
    );

  const activeSection:
    VolunteerSection =
    requested.success
      ? requested.data
      : "overview";

  const needsAssignments =
    activeSection === "overview" ||
    activeSection ===
      "assignments";

  const [
    skills,
    assignments,
    events,
  ] = await Promise.all([
    activeSection === "skills"
      ? listVolunteerSkills()
      : Promise.resolve([]),

    needsAssignments
      ? listVolunteerAssignments(
          volunteer.profileId,
        )
      : Promise.resolve([]),

    activeSection ===
        "assignments" &&
      viewerCanManage
      ? listSchedulableEvents()
      : Promise.resolve([]),
  ]);

  const selfServiceViewer =
    account.role === "volunteer" ||
    account.role === "parent";

  return (
    <div className="space-y-7">
      <header>
        <Link
          className="text-sm font-semibold text-sky-700 hover:text-sky-900"
          href={
            selfServiceViewer
              ? "/dashboard"
              : "/volunteers"
          }
        >
          {selfServiceViewer
            ? "← Back to dashboard"
            : "← Back to volunteers"}
        </Link>

        <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-sky-700">
              {selfServiceViewer
                ? "My volunteer profile"
                : "Volunteer workspace"}
            </p>

            <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">
              {volunteer.displayName}
            </h1>

            <p className="mt-2 text-base text-slate-600">
              {volunteer.ministryTitle ??
                "Volunteer"}
            </p>
          </div>

          <span
            className={`rounded-full px-3 py-1.5 text-sm font-semibold ${
              volunteer.isActive
                ? "bg-emerald-100 text-emerald-800"
                : "bg-slate-100 text-slate-700"
            }`}
          >
            {volunteer.isActive
              ? "Active"
              : "Inactive"}
          </span>
        </div>
      </header>

      <VolunteerWorkspaceNavigation
        active={activeSection}
        profileId={
          volunteer.profileId
        }
      />

      {activeSection ===
      "overview" ? (
        <VolunteerOverview
          assignments={assignments}
          volunteer={
            volunteerForViewer
          }
        />
      ) : null}

      {activeSection ===
      "skills" ? (
        <VolunteerSkillsSection
          skills={skills}
          volunteer={
            volunteerForViewer
          }
        />
      ) : null}

      {activeSection ===
      "availability" ? (
        <VolunteerAvailabilitySection
          volunteer={
            volunteerForViewer
          }
        />
      ) : null}

      {activeSection ===
      "assignments" ? (
        <VolunteerAssignmentsSection
          assignments={
            assignments
          }
          events={events}
          volunteer={
            volunteerForViewer
          }
        />
      ) : null}
    </div>
  );
}