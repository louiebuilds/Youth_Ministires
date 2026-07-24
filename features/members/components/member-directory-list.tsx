import type { MemberDirectoryEntry } from "@/features/members/types/member-directory";

const statusLabels = {
  prospective: "Prospective",
  registered: "Registered",
  active: "Active",
  inactive: "Inactive",
  archived: "Archived",
} as const;

export function MemberDirectoryList({
  members,
  familyContext,
}: Readonly<{
  members: MemberDirectoryEntry[];
  familyContext: boolean;
}>) {
  if (members.length === 0) {
    return (
      <section className="rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <h2 className="font-semibold text-slate-950">
          {familyContext ? "No related children found" : "No members found"}
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          {familyContext
            ? "Your account does not currently have a permitted child relationship matching these filters."
            : "Try clearing a filter or searching with a different name, family, grade, or tag."}
        </p>
      </section>
    );
  }

  return (
    <section aria-label="Member results" className="space-y-3">
      <p className="text-sm text-slate-600">
        Showing {members.length} {members.length === 1 ? "member" : "members"}.
      </p>
      <div className="grid gap-4 lg:grid-cols-2">
        {members.map((member) => (
          <article
            className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
            key={member.studentId}
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-slate-950">
                  {member.displayName}
                </h2>
                <p className="mt-1 text-sm text-slate-600">
                  {member.householdName}
                </p>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                {statusLabels[member.status]}
              </span>
            </div>
            <dl className="mt-5 grid grid-cols-2 gap-4 text-sm">
              <div>
                <dt className="text-slate-500">Grade</dt>
                <dd className="mt-1 font-medium text-slate-900">
                  {member.grade}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">Family</dt>
                <dd className="mt-1 font-medium text-slate-900">
                  {member.householdName}
                </dd>
              </div>
            </dl>
            {member.tags.length > 0 ? (
              <ul aria-label="Member tags" className="mt-5 flex flex-wrap gap-2">
                {member.tags.map((tag) => (
                  <li
                    className="rounded-full border px-2.5 py-1 text-xs font-medium"
                    key={tag.id}
                    style={{
                      borderColor: tag.color,
                      color: tag.color,
                    }}
                  >
                    {tag.name}
                  </li>
                ))}
              </ul>
            ) : null}
            <Link
              className="mt-5 inline-flex min-h-11 items-center rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              href={`/students/${member.studentId}`}
            >
              Open child
            </Link>
          </article>
        ))}
      </div>
    </section>
  );
}
import Link from "next/link";
