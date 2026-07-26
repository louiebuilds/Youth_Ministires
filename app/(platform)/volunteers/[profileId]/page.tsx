import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";

import { requireCapability } from "@/features/auth/services/authorization-service";
import {
  AvailabilityForm,
  CertificationForm,
  ScheduleVolunteerForm,
  SkillForms,
  VolunteerAssignmentList,
  VolunteerProfileForm,
} from "@/features/volunteers/components/volunteer-management-forms";
import {
  getVolunteerWorkspace,
  listSchedulableEvents,
  listVolunteerAssignments,
  listVolunteerSkills,
} from "@/features/volunteers/services/volunteer-management-service";

export const metadata: Metadata = { title: "Volunteer workspace" };

export default async function VolunteerWorkspacePage({
  params,
}: Readonly<{ params: Promise<{ profileId: string }> }>) {
  const account = await requireCapability("volunteers.view");
  const parsed = z.string().uuid().safeParse((await params).profileId);
  if (!parsed.success || (account.role === "volunteer" && account.id !== parsed.data)) notFound();
  const result = await getVolunteerWorkspace(parsed.data);
  if (!result.success) notFound();
  const volunteer = result.volunteer;
  const [skills, assignments, events] = await Promise.all([
    listVolunteerSkills(),
    listVolunteerAssignments(volunteer.profileId),
    volunteer.canManage ? listSchedulableEvents() : Promise.resolve([]),
  ]);
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

  return <div className="space-y-8">
    <section><Link className="text-sm font-semibold text-sky-700 hover:text-sky-900" href="/volunteers">← Back to volunteers</Link><h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-950">{volunteer.displayName}</h1><p className="mt-2 text-base text-slate-600">{volunteer.ministryTitle ?? "Volunteer"} · {volunteer.primaryRole.replaceAll("_", " ")}</p></section>

    <div className="grid gap-6 lg:grid-cols-3">
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="text-lg font-semibold text-slate-950">Compliance summary</h2><dl className="mt-4 space-y-3 text-sm"><div><dt className="text-slate-500">Background check</dt><dd className="font-medium text-slate-900">{volunteer.backgroundCheckStatus.replaceAll("_", " ")}</dd></div><div><dt className="text-slate-500">Completed</dt><dd>{volunteer.backgroundCheckCompletedAt ?? "Not recorded"}</dd></div><div><dt className="text-slate-500">Expires</dt><dd>{volunteer.backgroundCheckExpiresAt ?? "Not recorded"}</dd></div></dl></section>
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2"><h2 className="text-lg font-semibold text-slate-950">Certifications</h2>{volunteer.certifications.length ? <ul className="mt-4 divide-y divide-slate-200">{volunteer.certifications.map((item) => <li className="py-3 text-sm" key={item.id}><strong>{item.name}</strong><span className="ml-2 text-slate-600">{item.status}{item.expiresAt ? ` · expires ${item.expiresAt}` : ""}</span></li>)}</ul> : <p className="mt-3 text-sm text-slate-600">No certifications recorded.</p>}</section>
    </div>

    {volunteer.canManage ? <section className="space-y-4 rounded-xl border border-sky-200 bg-sky-50/50 p-5"><h2 className="text-xl font-semibold text-slate-950">Profile and background check</h2><VolunteerProfileForm volunteer={volunteer} /><h2 className="pt-3 text-xl font-semibold text-slate-950">Add certification</h2><CertificationForm profileId={volunteer.profileId} /></section> : null}

    <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="text-xl font-semibold text-slate-950">Skills</h2>{volunteer.skills.length ? <ul className="flex flex-wrap gap-2">{volunteer.skills.map((skill) => <li className="rounded-full bg-sky-50 px-3 py-1.5 text-sm text-sky-900" key={skill.assignmentId}>{skill.name} · {skill.level}</li>)}</ul> : <p className="text-sm text-slate-600">No skills recorded.</p>}<SkillForms canManage={volunteer.canManage} profileId={volunteer.profileId} skills={skills} /></section>

    <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="text-xl font-semibold text-slate-950">Recurring availability</h2>{volunteer.availability.length ? <ul className="grid gap-3 md:grid-cols-2">{volunteer.availability.map((item) => <li className="rounded-lg bg-slate-50 p-3 text-sm" key={item.id}><strong>{days[item.dayOfWeek]}</strong> · {item.startsAt}–{item.endsAt}<p className="mt-1 text-slate-600">{item.timezone}</p></li>)}</ul> : <p className="text-sm text-slate-600">No recurring availability recorded.</p>}<AvailabilityForm profileId={volunteer.profileId} /></section>

    <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><div><p className="text-sm font-semibold text-sky-700">Volunteer scheduling</p><h2 className="mt-1 text-xl font-semibold text-slate-950">Event assignments</h2></div><VolunteerAssignmentList assignments={assignments} canManage={volunteer.canManage} profileId={volunteer.profileId} />{volunteer.canManage ? <ScheduleVolunteerForm events={events} profileId={volunteer.profileId} /> : null}</section>
  </div>;
}
