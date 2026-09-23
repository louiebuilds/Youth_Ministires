import type { FamilyDirectoryEntry } from "@/features/members/types/family-directory";

const statusLabels = {
  prospect: "Prospect",
  active: "Active",
  inactive: "Inactive",
  archived: "Archived",
} as const;

export function FamilyDirectoryList({
  families,
  familyContext,
}: Readonly<{
  families: FamilyDirectoryEntry[];
  familyContext: boolean;
}>) {
  if (families.length === 0) {
    return (
      <section className="rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <h2 className="font-semibold text-slate-950">
          {familyContext ? "No related family found" : "No families found"}
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          {familyContext
            ? "This account is not currently linked to a family record. Ask a ministry administrator or Youth Pastor to connect your account to your family."
            : "Try a different family name, city, or region."}
        </p>
      </section>
    );
  }

  return (
    <section aria-label="Family results" className="space-y-3">
      <p className="text-sm text-slate-600">
        Showing {families.length} {families.length === 1 ? "family" : "families"}.
      </p>
      <div className="grid gap-4 lg:grid-cols-2">
        {families.map((family) => (
          <article
            className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
            key={family.householdId}
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-slate-950">
                  {family.householdName}
                </h2>
                <p className="mt-1 text-sm text-slate-600">
                  {[family.city, family.region].filter(Boolean).join(", ") ||
                    "Location not provided"}
                </p>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                {statusLabels[family.status]}
              </span>
            </div>
            <dl className="mt-5 grid grid-cols-2 gap-4 text-sm">
              <div>
                <dt className="text-slate-500">Adults</dt>
                <dd className="mt-1 text-xl font-semibold text-slate-950">
                  {family.adultCount}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">Children</dt>
                <dd className="mt-1 text-xl font-semibold text-slate-950">
                  {family.studentCount}
                </dd>
              </div>
            </dl>
            <Link
              className="mt-5 inline-flex min-h-11 items-center rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              href={`/families/${family.householdId}`}
            >
              Open family
            </Link>
          </article>
        ))}
      </div>
    </section>
  );
}
import Link from "next/link";
