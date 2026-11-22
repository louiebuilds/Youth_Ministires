import type { Metadata } from "next";
import Link from "next/link";

import { PageHero } from "@/components/ui/page-hero";

import { requireCapability } from "@/features/auth/services/authorization-service";
import { MemberDirectoryList } from "@/features/members/components/member-directory-list";
import { memberDirectoryQuerySchema } from "@/features/members/schemas/member-directory-schema";
import {
  listMemberDirectory,
  listMemberTags,
} from "@/features/members/services/member-directory-service";

export const metadata: Metadata = {
  title: "Members",
};

export default async function StudentsPage({
  searchParams,
}: Readonly<{
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}>) {
  const account = await requireCapability("students.view");
  const params = await searchParams;
  const parsed = memberDirectoryQuerySchema.safeParse({
    q: typeof params.q === "string" ? params.q : undefined,
    grade: typeof params.grade === "string" ? params.grade : undefined,
    status: typeof params.status === "string" ? params.status : undefined,
    tag: typeof params.tag === "string" ? params.tag : undefined,
    guardian: typeof params.guardian === "string" ? params.guardian : undefined,
  });
  const filters = parsed.success
    ? {
        search: parsed.data.q,
        grade: parsed.data.grade,
        status: parsed.data.status ?? null,
        tagId: parsed.data.tag,
        guardianStatus: parsed.data.guardian,
      }
    : {
        search: null,
        grade: null,
        status: null,
        tagId: null,
        guardianStatus: null,
      };
  const familyContext = account.role === "parent";
  const [directory, tags] = await Promise.all([
    listMemberDirectory(filters),
    familyContext ? Promise.resolve([]) : listMemberTags(),
  ]);

  return (
    <div className="space-y-8">
      <PageHero
        description={familyContext ? "View children connected to this family account through an approved relationship." : "Search youth members by minimized name, family, grade, lifecycle status, or ministry tag."}
        eyebrow={familyContext ? "Family" : "Member management"}
        title={familyContext ? "Your children" : "Students"}
      />

      {!familyContext &&
      (account.role === "platform_administrator" || account.role === "youth_pastor") ? (
        <div className="flex flex-wrap gap-3">
          <Link className="inline-flex min-h-11 items-center rounded-lg bg-sky-700 px-5 py-2 text-sm font-semibold text-white" href="/students/new">
            Add student
          </Link>
          <Link className="inline-flex min-h-11 items-center rounded-lg border border-slate-300 px-5 py-2 text-sm font-semibold text-slate-700" href="/students?guardian=unlinked">
            Students without linked guardian
          </Link>
        </div>
      ) : null}

      <section
        aria-label="Filter members"
        className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm shadow-slate-900/5 sm:p-6"
      >
        <form className="grid gap-4 md:grid-cols-2 xl:grid-cols-5" method="get">
          <label className="text-sm font-medium text-slate-800 xl:col-span-2">
            Search
            <input
              className="mt-2 min-h-11 w-full rounded-lg border border-slate-300 px-3 py-2 text-base outline-none focus:border-sky-600 focus:ring-3 focus:ring-sky-100"
              defaultValue={filters.search ?? ""}
              maxLength={100}
              name="q"
              placeholder="Name or family"
              type="search"
            />
          </label>
          <label className="text-sm font-medium text-slate-800">
            Grade
            <input
              className="mt-2 min-h-11 w-full rounded-lg border border-slate-300 px-3 py-2 text-base outline-none focus:border-sky-600 focus:ring-3 focus:ring-sky-100"
              defaultValue={filters.grade ?? ""}
              maxLength={40}
              name="grade"
              placeholder="Any grade"
            />
          </label>
          <label className="text-sm font-medium text-slate-800">
            Status
            <select
              className="mt-2 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-base outline-none focus:border-sky-600 focus:ring-3 focus:ring-sky-100"
              defaultValue={filters.status ?? ""}
              name="status"
            >
              <option value="">Any status</option>
              <option value="prospective">Prospective</option>
              <option value="registered">Registered</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="archived">Archived</option>
            </select>
          </label>
          {!familyContext ? (
            <label className="text-sm font-medium text-slate-800">
              Tag
              <select
                className="mt-2 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-base outline-none focus:border-sky-600 focus:ring-3 focus:ring-sky-100"
                defaultValue={filters.tagId ?? ""}
                name="tag"
              >
                <option value="">Any tag</option>
                {tags.map((tag) => (
                  <option key={tag.id} value={tag.id}>
                    {tag.name}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          <div className="flex items-end gap-3 xl:col-span-5">
            <button
              className="min-h-11 rounded-lg bg-sky-700 px-5 py-2 text-sm font-semibold text-white hover:bg-sky-800"
              type="submit"
            >
              Apply filters
            </button>
            <Link
              className="flex min-h-11 items-center rounded-lg border border-slate-300 px-5 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              href="/students"
            >
              Clear
            </Link>
          </div>
        </form>
        {!parsed.success ? (
          <p className="mt-4 text-sm text-red-700">
            One or more filters were invalid and have been cleared.
          </p>
        ) : null}
      </section>

      {!directory.success ? (
        <section className="rounded-xl border border-red-200 bg-red-50 p-5 text-red-900">
          The member directory is temporarily unavailable. Refresh and try
          again.
        </section>
      ) : (
        <MemberDirectoryList
          familyContext={familyContext}
          members={directory.members}
        />
      )}
    </div>
  );
}
