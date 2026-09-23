import type { Metadata } from "next";
import Link from "next/link";

import { requireCapability } from "@/features/auth/services/authorization-service";
import { FamilyDirectoryList } from "@/features/members/components/family-directory-list";
import { listAccessibleFamilies } from "@/features/members/services/family-directory-service";

export const metadata: Metadata = {
  title: "Families",
};

export default async function FamiliesPage({
  searchParams,
}: Readonly<{
  searchParams: Promise<{ q?: string | string[] }>;
}>) {
  const account = await requireCapability("families.view");
  const queryValue = (await searchParams).q;
  const candidate = typeof queryValue === "string" ? queryValue.trim() : "";
  const validSearch = candidate.length <= 100;
  const search = validSearch && candidate ? candidate : null;
  const result = await listAccessibleFamilies(search);
  const familyContext = account.role === "parent";

  return (
    <div className="space-y-8">
      <section aria-labelledby="family-directory-heading">
        <p className="text-sm font-semibold text-sky-700">
          {familyContext ? "Family" : "Member management"}
        </p>
        <h1
          className="mt-1 text-3xl font-bold tracking-tight text-slate-950"
          id="family-directory-heading"
        >
          {familyContext ? "Your family" : "Families"}
        </h1>
        <p className="mt-2 max-w-3xl text-base leading-7 text-slate-600">
          {familyContext
            ? "View family records connected to this account."
            : "Find families by family name, city, or region. Street addresses and contact details stay out of directory results."}
        </p>
      </section>

      {!familyContext ? (
        <div>
          <Link
            className="inline-flex min-h-11 items-center rounded-lg bg-sky-700 px-5 py-2 text-sm font-semibold text-white hover:bg-sky-800"
            href="/families/new"
          >
            New family
          </Link>
        </div>
      ) : null}

      {familyContext && result.success && result.families.length > 0 ? (
        <div>
          <Link
            className="inline-flex min-h-11 items-center rounded-lg bg-sky-700 px-5 py-2 text-sm font-semibold text-white hover:bg-sky-800"
            href="/family-check-in"
          >
            Create check-in pass
          </Link>
        </div>
      ) : null}

      {!familyContext ? (
        <section
          aria-label="Search families"
          className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
        >
          <form className="flex flex-col gap-3 sm:flex-row" method="get">
            <label className="sr-only" htmlFor="family-search">
              Search families
            </label>
            <input
              className="min-h-11 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-base outline-none focus:border-sky-600 focus:ring-3 focus:ring-sky-100"
              defaultValue={search ?? ""}
              id="family-search"
              maxLength={100}
              name="q"
              placeholder="Family name, city, or region"
              type="search"
            />
            <button
              className="min-h-11 rounded-lg bg-sky-700 px-5 py-2 text-sm font-semibold text-white hover:bg-sky-800"
              type="submit"
            >
              Search
            </button>
            <Link
              className="flex min-h-11 items-center justify-center rounded-lg border border-slate-300 px-5 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              href="/families"
            >
              Clear
            </Link>
          </form>
          {!validSearch ? (
            <p className="mt-3 text-sm text-red-700">
              Search must be 100 characters or fewer.
            </p>
          ) : null}
        </section>
      ) : null}

      {!result.success ? (
        <section className="rounded-xl border border-red-200 bg-red-50 p-5 text-red-900">
          Family records are temporarily unavailable. Refresh and try again.
        </section>
      ) : (
        <FamilyDirectoryList
          families={result.families}
          familyContext={familyContext}
        />
      )}
    </div>
  );
}
