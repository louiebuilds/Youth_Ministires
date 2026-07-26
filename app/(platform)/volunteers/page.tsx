import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { requireCapability } from "@/features/auth/services/authorization-service";
import { NewVolunteerForm } from "@/features/volunteers/components/volunteer-management-forms";
import {
  listVolunteerCandidates,
  listVolunteerDirectory,
} from "@/features/volunteers/services/volunteer-management-service";

export const metadata: Metadata = { title: "Volunteers" };

export default async function VolunteersPage({
  searchParams,
}: Readonly<{
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}>) {
  const account = await requireCapability("volunteers.view");
  if (account.role === "volunteer") redirect(`/volunteers/${account.id}`);

  const params = await searchParams;
  const search = typeof params.q === "string" && params.q.length <= 100
    ? params.q.trim() || null
    : null;
  const [directory, candidates] = await Promise.all([
    listVolunteerDirectory(search),
    listVolunteerCandidates(),
  ]);

  return <div className="space-y-8">
    <section>
      <p className="text-sm font-semibold text-sky-700">Volunteer management</p>
      <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">Volunteer directory</h1>
      <p className="mt-2 max-w-3xl text-base leading-7 text-slate-600">Manage volunteer profiles, compliance status, certifications, skills, and recurring availability. Scheduling is the next Milestone 7 step.</p>
    </section>

    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <form className="flex flex-col gap-3 sm:flex-row" method="get">
        <label className="grow text-sm font-medium text-slate-800">Search<input className="mt-2 min-h-11 w-full rounded-lg border border-slate-300 px-3 py-2" defaultValue={search ?? ""} maxLength={100} name="q" placeholder="Name or ministry title" type="search" /></label>
        <button className="min-h-11 self-end rounded-lg bg-sky-700 px-5 py-2 text-sm font-semibold text-white">Search</button>
      </form>
    </section>

    {candidates.length > 0 ? <section className="space-y-3"><h2 className="text-xl font-semibold text-slate-950">Add volunteer profile</h2><NewVolunteerForm candidates={candidates} /></section> : null}

    {!directory.success ? <section className="rounded-xl border border-red-200 bg-red-50 p-5 text-red-900">The volunteer directory is temporarily unavailable.</section> :
      directory.volunteers.length === 0 ? <section className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-slate-600">No volunteer profiles match this search.</section> :
      <ul className="grid gap-4 lg:grid-cols-2">{directory.volunteers.map((volunteer) => <li className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm" key={volunteer.profileId}>
        <div className="flex items-start justify-between gap-4"><div><h2 className="text-lg font-semibold text-slate-950">{volunteer.displayName}</h2><p className="mt-1 text-sm text-slate-600">{volunteer.ministryTitle ?? "No ministry title"} · {volunteer.primaryRole.replaceAll("_", " ")}</p></div><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${volunteer.isActive ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-700"}`}>{volunteer.isActive ? "Active" : "Inactive"}</span></div>
        <p className="mt-4 text-sm text-slate-700">Background check: <strong>{volunteer.backgroundCheckStatus.replaceAll("_", " ")}</strong>{volunteer.backgroundCheckExpiresAt ? ` · expires ${volunteer.backgroundCheckExpiresAt}` : ""}</p>
        {volunteer.skills.length > 0 ? <ul className="mt-3 flex flex-wrap gap-2">{volunteer.skills.map((skill) => <li className="rounded-full bg-sky-50 px-2.5 py-1 text-xs font-medium text-sky-800" key={skill.id}>{skill.name}</li>)}</ul> : null}
        <Link className="mt-5 inline-flex min-h-11 items-center rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50" href={`/volunteers/${volunteer.profileId}`}>Open volunteer</Link>
      </li>)}</ul>}
  </div>;
}
