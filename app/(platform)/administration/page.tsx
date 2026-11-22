import type { Metadata } from "next";
import Link from "next/link";

import { requireCapability } from "@/features/auth/services/authorization-service";

export const metadata: Metadata = {
  title: "Administration",
};

type AdministrationSection = {
  description: string;
  href?: string;
  title: string;
};

const sections: readonly AdministrationSection[] = [
  {
    description: "Manage accounts, lifecycle, effective access, and account support.",
    href: "/administration/accounts",
    title: "Accounts",
  },
  {
    description: "Review invitations for ministry platform access.",
    href: "/administration/invitations",
    title: "Invitations",
  },
  {
    description: "Review the read-only record of administrative and system activity.",
    href: "/administration/audit",
    title: "Audit Log",
  },
  {
    description: "Manage ministry-wide administrative configuration.",
    href: "/administration/ministry-settings",
    title: "Ministry Settings",
  },
];

export default async function AdministrationPage() {
  const account = await requireCapability("administration.manage");
  const visibleSections: readonly AdministrationSection[] =
    account.role === "platform_administrator"
      ? [
          ...sections,
          {
            description: "Manage platform-level system configuration.",
            href: "/administration/system-settings",
            title: "System Settings",
          },
        ]
      : sections;

  return (
    <div className="space-y-7">
      <header className="rounded-3xl bg-gradient-to-br from-[#0b1739] via-indigo-950 to-violet-800 px-6 py-8 text-white shadow-xl shadow-slate-950/10 sm:px-8">
        <p className="text-sm font-semibold text-violet-200">
          Platform management
        </p>
        <h1 className="mt-1 text-3xl font-bold text-white sm:text-4xl">
          Administration
        </h1>
        <p className="mt-2 max-w-3xl text-violet-100">
          Manage accounts, access, audit history, and ministry administration.
        </p>
      </header>

      <section
        aria-label="Administration areas"
        className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
      >
        {visibleSections.map((section) => (
          section.href ? (
            <Link
              className="group rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm shadow-slate-900/5 transition hover:-translate-y-0.5 hover:border-violet-300 hover:shadow-lg"
              href={section.href}
              key={section.title}
            >
              <h2 className="text-lg font-bold text-slate-950">
                {section.title}
              </h2>
              <p className="mt-2 text-sm text-slate-600">
                {section.description}
              </p>
              <p className="mt-4 text-sm font-semibold text-sky-800">
                Open
              </p>
            </Link>
          ) : (
            <article
              className="rounded-xl border border-slate-200 bg-slate-50 p-5"
              key={section.title}
            >
              <h2 className="text-lg font-bold text-slate-950">
                {section.title}
              </h2>
              <p className="mt-2 text-sm text-slate-600">
                {section.description}
              </p>
              <p className="mt-4 text-sm font-semibold text-slate-500">
                Coming later
              </p>
            </article>
          )
        ))}
      </section>
    </div>
  );
}
