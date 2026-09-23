import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireCapability } from "@/features/auth/services/authorization-service";
import { CreateScheduleForm } from "@/features/scheduling/components/scheduling-forms";
import { listSchedulingEventOptions } from "@/features/scheduling/services/scheduling-service";

export const metadata: Metadata = { title: "Create Schedule" };
export default async function NewSchedulePage() { const account = await requireCapability("scheduling.view"); if (!["platform_administrator", "youth_pastor", "staff_member"].includes(account.role)) notFound(); const events = await listSchedulingEventOptions(); return <div className="mx-auto max-w-4xl space-y-6"><Link className="text-sm font-semibold text-sky-700" href="/scheduling">← Back to Scheduling</Link><header><p className="text-sm font-semibold text-sky-700">Scheduling</p><h1 className="mt-1 text-3xl font-bold">Create schedule</h1><p className="mt-2 text-slate-600">Create a draft, then add positions and assignments in its workspace.</p></header><section className="rounded-xl border bg-white p-5 shadow-sm"><CreateScheduleForm events={events} /></section></div>; }
