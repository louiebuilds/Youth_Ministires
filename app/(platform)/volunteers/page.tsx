import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { requireCapability } from "@/features/auth/services/authorization-service";
import {
  NewVolunteerForm,
  SkillCatalogForm,
} from "@/features/volunteers/components/volunteer-management-forms";
import {
  listVolunteerCandidates,
  listVolunteerDirectory,
  listVolunteerSkills,
} from "@/features/volunteers/services/volunteer-management-service";

export const metadata: Metadata = {
  title: "Volunteers",
};

type VolunteerView =
  | "directory"
  | "skills";

function getView(
  value: string | string[] | undefined,
): VolunteerView {
  return value === "skills"
    ? "skills"
    : "directory";
}

function WorkspaceLink({
  active,
  href,
  children,
}: {
  active: boolean;
  href: string;
  children: ReactNode;
}) {
  return (
    <Link
      className={
        active
          ? "inline-flex min-h-12 items-center border-b-2 border-sky-700 px-4 font-semibold text-sky-800"
          : "inline-flex min-h-12 items-center border-b-2 border-transparent px-4 font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-950"
      }
      href={href}
    >
      {children}
    </Link>
  );
}

export default async function VolunteersPage({
  searchParams,
}: Readonly<{
  searchParams: Promise<
    Record<
      string,
      string | string[] | undefined
    >
  >;
}>) {
  const account =
    await requireCapability(
      "volunteers.view",
    );

  if (account.role === "volunteer") {
    redirect(
      `/volunteers/${account.id}`,
    );
  }

  const params = await searchParams;

  const view = getView(params.view);

  const showNewVolunteer =
    view === "directory" &&
    params.action === "new";

  const search =
    typeof params.q === "string" &&
    params.q.length <= 100
      ? params.q.trim() || null
      : null;

  const [
    directory,
    candidates,
    skills,
  ] = await Promise.all([
    listVolunteerDirectory(
      view === "directory"
        ? search
        : null,
    ),
    listVolunteerCandidates(),
    listVolunteerSkills(),
  ]);

  return (
    <div className="space-y-8">
      <header>
        <div className="max-w-4xl">
          <p className="text-sm font-semibold text-sky-700">
            Volunteer management
          </p>

          <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">
            Volunteers
          </h1>

          <p className="mt-2 max-w-3xl text-base leading-7 text-slate-600">
            Manage volunteer profiles,
            compliance, certifications,
            skills, availability, and event
            assignments.
          </p>
        </div>

        <nav
          aria-label="Volunteer workspaces"
          className="mt-8 flex flex-wrap border-b border-slate-200"
        >
          <WorkspaceLink
            active={
              view === "directory"
            }
            href="/volunteers?view=directory"
          >
            Directory
          </WorkspaceLink>

          <WorkspaceLink
            active={view === "skills"}
            href="/volunteers?view=skills"
          >
            Skills Catalog
          </WorkspaceLink>
        </nav>
      </header>

      {view === "directory" ? (
        <section className="space-y-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-slate-950">
                Volunteer directory
              </h2>

              <p className="mt-1 text-slate-600">
                Search volunteer profiles and
                review ministry roles,
                compliance, and skills.
              </p>
            </div>

            {candidates.length > 0 ? (
              <Link
                className={
                  showNewVolunteer
                    ? "inline-flex min-h-11 items-center rounded-lg bg-slate-900 px-4 font-semibold text-white"
                    : "inline-flex min-h-11 items-center rounded-lg bg-sky-700 px-4 font-semibold text-white transition hover:bg-sky-800"
                }
                href={
                  showNewVolunteer
                    ? "/volunteers?view=directory"
                    : "/volunteers?view=directory&action=new"
                }
              >
                {showNewVolunteer
                  ? "Close"
                  : "Add volunteer profile"}
              </Link>
            ) : null}
          </div>

          {showNewVolunteer &&
          candidates.length > 0 ? (
            <div className="space-y-3">
              <h3 className="text-xl font-semibold text-slate-950">
                Add volunteer profile
              </h3>

              <NewVolunteerForm
                candidates={candidates}
              />
            </div>
          ) : null}

          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <form
              className="flex flex-col gap-3 sm:flex-row"
              method="get"
            >
              <input
                name="view"
                type="hidden"
                value="directory"
              />

              <label className="grow text-sm font-medium text-slate-800">
                Search

                <input
                  className="mt-2 min-h-11 w-full rounded-lg border border-slate-300 px-3 py-2"
                  defaultValue={
                    search ?? ""
                  }
                  maxLength={100}
                  name="q"
                  placeholder="Name or ministry title"
                  type="search"
                />
              </label>

              <button className="min-h-11 self-end rounded-lg bg-sky-700 px-5 py-2 text-sm font-semibold text-white">
                Search
              </button>
            </form>
          </section>

          {!directory.success ? (
            <section className="rounded-xl border border-red-200 bg-red-50 p-5 text-red-900">
              The volunteer directory is
              temporarily unavailable.
            </section>
          ) : directory.volunteers.length ===
            0 ? (
            <section className="rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-600">
              No volunteer profiles match this
              search.
            </section>
          ) : (
            <ul className="grid gap-4 lg:grid-cols-2">
              {directory.volunteers.map(
                (volunteer) => (
                  <li
                    className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
                    key={
                      volunteer.profileId
                    }
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="text-lg font-semibold text-slate-950">
                          {
                            volunteer.displayName
                          }
                        </h3>

                        <p className="mt-1 text-sm text-slate-600">
                          {volunteer.ministryTitle ??
                            "No ministry title"}{" "}
                          ·{" "}
                          {volunteer.primaryRole.replaceAll(
                            "_",
                            " ",
                          )}
                        </p>
                      </div>

                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
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

                    {volunteer.skills.length >
                    0 ? (
                      <ul className="mt-3 flex flex-wrap gap-2">
                        {volunteer.skills.map(
                          (skill) => (
                            <li
                              className="rounded-full bg-sky-50 px-2.5 py-1 text-xs font-medium text-sky-800"
                              key={skill.id}
                            >
                              {skill.name}
                            </li>
                          ),
                        )}
                      </ul>
                    ) : null}

                    <Link
                      className="mt-5 inline-flex min-h-11 items-center rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
                      href={`/volunteers/${volunteer.profileId}`}
                    >
                      Open volunteer
                    </Link>
                  </li>
                ),
              )}
            </ul>
          )}
        </section>
      ) : null}

      {view === "skills" ? (
        <section className="space-y-6">
          <div>
            <p className="text-sm font-semibold text-sky-700">
              Ministry-wide configuration
            </p>

            <h2 className="mt-1 text-2xl font-bold text-slate-950">
              Volunteer skill catalog
            </h2>

            <p className="mt-1 text-slate-600">
              Create reusable skill options
              for volunteer profiles.
            </p>
          </div>

          {skills.length ? (
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="text-lg font-semibold text-slate-950">
                Current skills
              </h3>

              <ul className="mt-4 flex flex-wrap gap-2">
                {skills.map((skill) => (
                  <li
                    className="rounded-full bg-sky-50 px-3 py-1.5 text-sm text-sky-900"
                    key={skill.id}
                  >
                    {skill.name}
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="rounded-xl border border-slate-200 bg-white p-6 text-slate-600">
              No skill options have been
              created.
            </p>
          )}

          <div>
            <h3 className="mb-3 text-xl font-semibold text-slate-950">
              Create skill option
            </h3>

            <SkillCatalogForm />
          </div>
        </section>
      ) : null}
    </div>
  );
}
