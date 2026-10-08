import Link from "next/link";

import {
  AvailabilityForm,
  CertificationForm,
  ScheduleVolunteerForm,
  SkillAssignmentForm,
  VolunteerAssignmentList,
} from "@/features/volunteers/components/volunteer-management-forms";

import type {
  SchedulableEvent,
  VolunteerAssignment,
  VolunteerWorkspace,
} from "@/features/volunteers/types/volunteer-management";

export const volunteerSections = [
  {
    id: "overview",
    label: "Overview",
  },
  {
    id: "skills",
    label: "Skills",
  },
  {
    id: "availability",
    label: "Availability",
  },
  {
    id: "assignments",
    label: "Assignments",
  },
] as const;

export type VolunteerSection =
  (typeof volunteerSections)[number]["id"];

export function VolunteerWorkspaceNavigation({
  active,
  profileId,
}: Readonly<{
  active: VolunteerSection;
  profileId: string;
}>) {
  return (
    <nav
      aria-label="Volunteer workspace sections"
      className="overflow-x-auto border-b border-slate-200"
    >
      <div className="flex min-w-max gap-1">
        {volunteerSections.map(
          ({ id, label }) => (
            <Link
              aria-current={
                active === id
                  ? "page"
                  : undefined
              }
              className={`min-h-11 border-b-2 px-4 py-3 text-sm font-semibold ${
                active === id
                  ? "border-sky-700 text-sky-800"
                  : "border-transparent text-slate-600 hover:border-slate-300 hover:text-slate-950"
              }`}
              href={
                id === "overview"
                  ? `/volunteers/${profileId}`
                  : `/volunteers/${profileId}?section=${id}`
              }
              key={id}
            >
              {label}
            </Link>
          ),
        )}
      </div>
    </nav>
  );
}

const days = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

export function VolunteerOverview({
  assignments,
  volunteer,
}: Readonly<{
  assignments: VolunteerAssignment[];
  volunteer: VolunteerWorkspace;
}>) {
  const upcoming = assignments.filter(
    (item) => !item.isPast,
  );

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-950">
          Volunteer status
        </h2>

        <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-slate-500">
              Ministry title
            </dt>

            <dd className="font-medium text-slate-900">
              {volunteer.ministryTitle ??
                "Not recorded"}
            </dd>
          </div>

          <div>
            <dt className="text-slate-500">
              Profile
            </dt>

            <dd className="font-medium text-slate-900">
              {volunteer.isActive
                ? "Active"
                : "Inactive"}
            </dd>
          </div>

          <div>
            <dt className="text-slate-500">
              Primary role
            </dt>

            <dd className="font-medium capitalize text-slate-900">
              {volunteer.primaryRole.replaceAll(
                "_",
                " ",
              )}
            </dd>
          </div>
        </dl>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-950">
          Operational summary
        </h2>

        <dl className="mt-4 grid grid-cols-2 gap-4 text-sm">
          <div>
            <dt className="text-slate-500">
              Certifications
            </dt>

            <dd className="text-2xl font-bold text-slate-950">
              {
                volunteer.certifications
                  .length
              }
            </dd>
          </div>

          <div>
            <dt className="text-slate-500">
              Skills
            </dt>

            <dd className="text-2xl font-bold text-slate-950">
              {volunteer.skills.length}
            </dd>
          </div>

          <div>
            <dt className="text-slate-500">
              Availability windows
            </dt>

            <dd className="text-2xl font-bold text-slate-950">
              {
                volunteer.availability
                  .length
              }
            </dd>
          </div>

          <div>
            <dt className="text-slate-500">
              Upcoming assignments
            </dt>

            <dd className="text-2xl font-bold text-slate-950">
              {upcoming.length}
            </dd>
          </div>
        </dl>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2">
        <h2 className="text-lg font-semibold text-slate-950">
          Certifications
        </h2>

        <p className="mt-1 text-sm text-slate-600">
          Record ministry training,
          certifications, or other relevant
          qualifications for this volunteer.
        </p>

        {volunteer.certifications.length ? (
          <ul className="mt-4 divide-y divide-slate-200">
            {volunteer.certifications.map(
              (item) => (
                <li
                  className="py-3 text-sm"
                  key={item.id}
                >
                  <strong>
                    {item.name}
                  </strong>

                  <span className="ml-2 text-slate-600">
                    {item.status}

                    {item.expiresAt
                      ? ` · expires ${item.expiresAt}`
                      : ""}
                  </span>

                  {volunteer.canManage &&
                  item.reference ? (
                    <p className="mt-1 text-slate-600">
                      Reference:{" "}
                      {item.reference}
                    </p>
                  ) : null}
                </li>
              ),
            )}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-slate-600">
            No certifications recorded.
          </p>
        )}

        {volunteer.canManage ? (
          <div className="mt-5 border-t border-slate-200 pt-5">
            <CertificationForm
              profileId={
                volunteer.profileId
              }
            />
          </div>
        ) : null}
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2">
        <h2 className="text-lg font-semibold text-slate-950">
          Current and upcoming event
          assignments
        </h2>

        {upcoming.length ? (
          <ul className="mt-4 grid gap-3 md:grid-cols-2">
            {upcoming
              .slice(0, 6)
              .map((item) => (
                <li
                  className="rounded-lg bg-slate-50 p-4 text-sm"
                  key={
                    item.assignmentId
                  }
                >
                  <strong className="text-slate-950">
                    {item.eventName}
                  </strong>

                  <p className="mt-1 text-slate-600">
                    {
                      item.assignmentRole
                    }{" "}
                    ·{" "}
                    {
                      item.assignmentStatus
                    }
                  </p>

                  <p className="mt-1 text-slate-600">
                    {new Date(
                      item.eventStartsAt,
                    ).toLocaleString()}{" "}
                    ·{" "}
                    {
                      item.eventTimezone
                    }
                  </p>
                </li>
              ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-slate-600">
            No current or upcoming
            assignments.
          </p>
        )}
      </section>
    </div>
  );
}

export function VolunteerSkillsSection({
  skills,
  volunteer,
}: Readonly<{
  skills: {
    id: string;
    name: string;
  }[];
  volunteer: VolunteerWorkspace;
}>) {
  return (
    <section className="space-y-5 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div>
        <h2 className="text-xl font-semibold text-slate-950">
          Volunteer skills
        </h2>

        <p className="mt-1 text-sm text-slate-600">
          Record this volunteer&apos;s
          skills, proficiency, and ministry
          notes.
        </p>
      </div>

      {volunteer.skills.length ? (
        <ul className="grid gap-3 md:grid-cols-2">
          {volunteer.skills.map(
            (skill) => (
              <li
                className="rounded-lg bg-slate-50 p-4 text-sm"
                key={
                  skill.assignmentId
                }
              >
                <strong>
                  {skill.name}
                </strong>

                <span className="ml-2 text-slate-600">
                  {skill.level}
                </span>

                {skill.notes ? (
                  <p className="mt-2 text-slate-600">
                    {skill.notes}
                  </p>
                ) : null}
              </li>
            ),
          )}
        </ul>
      ) : (
        <p className="text-sm text-slate-600">
          No skills recorded.
        </p>
      )}

      <SkillAssignmentForm
        profileId={
          volunteer.profileId
        }
        skills={skills}
      />
    </section>
  );
}

export function VolunteerAvailabilitySection({
  volunteer,
}: Readonly<{
  volunteer: VolunteerWorkspace;
}>) {
  return (
    <section className="space-y-5 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div>
        <h2 className="text-xl font-semibold text-slate-950">
          Recurring availability
        </h2>

        <p className="mt-1 text-sm text-slate-600">
          Maintain regular service windows
          and their effective dates.
        </p>
      </div>

      {volunteer.availability.length ? (
        <ul className="grid gap-3 md:grid-cols-2">
          {volunteer.availability.map(
            (item) => (
              <li
                className="rounded-lg bg-slate-50 p-4 text-sm"
                key={item.id}
              >
                <strong>
                  {
                    days[
                      item.dayOfWeek
                    ]
                  }
                </strong>{" "}
                · {item.startsAt}–
                {item.endsAt}

                <p className="mt-1 text-slate-600">
                  {item.timezone} · from{" "}
                  {item.effectiveFrom}

                  {item.effectiveUntil
                    ? ` through ${item.effectiveUntil}`
                    : ""}
                </p>

                {item.notes ? (
                  <p className="mt-2 text-slate-600">
                    {item.notes}
                  </p>
                ) : null}
              </li>
            ),
          )}
        </ul>
      ) : (
        <p className="text-sm text-slate-600">
          No recurring availability
          recorded.
        </p>
      )}

      <AvailabilityForm
        profileId={
          volunteer.profileId
        }
      />
    </section>
  );
}

export function VolunteerAssignmentsSection({
  assignments,
  events,
  volunteer,
}: Readonly<{
  assignments: VolunteerAssignment[];
  events: SchedulableEvent[];
  volunteer: VolunteerWorkspace;
}>) {
  const current = assignments.filter(
    (item) => !item.isPast,
  );

  const past = assignments.filter(
    (item) => item.isPast,
  );

  return (
    <div className="space-y-6">
      <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-xl font-semibold text-slate-950">
          Current and upcoming
          assignments
        </h2>

        <VolunteerAssignmentList
          assignments={current}
          canManage={
            volunteer.canManage
          }
          profileId={
            volunteer.profileId
          }
        />
      </section>

      {past.length ? (
        <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-950">
            Past assignments
          </h2>

          <VolunteerAssignmentList
            assignments={past}
            canManage={
              volunteer.canManage
            }
            profileId={
              volunteer.profileId
            }
          />
        </section>
      ) : null}

      {volunteer.canManage ? (
        <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div>
            <p className="text-sm font-semibold text-sky-700">
              Volunteer scheduling
            </p>

            <h2 className="mt-1 text-xl font-semibold text-slate-950">
              New event assignment
            </h2>
          </div>

          <ScheduleVolunteerForm
            events={events}
            profileId={
              volunteer.profileId
            }
          />
        </section>
      ) : null}
    </div>
  );
}