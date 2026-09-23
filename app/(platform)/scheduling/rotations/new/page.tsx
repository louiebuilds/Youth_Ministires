import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireCapability } from "@/features/auth/services/authorization-service";
import { CreateRotationForm } from "@/features/scheduling/components/scheduling-forms";
import { listCandidates } from "@/features/scheduling/services/scheduling-service";

export const metadata: Metadata = { title: "Create Rotation" };
export default async function NewRotationPage() { const account = await requireCapability("scheduling.view"); if (!["platform_administrator", "youth_pastor", "staff_member"].includes(account.role)) notFound(); const candidates = await listCandidates(); return <div className="space-y-6"><Link className="text-sm font-semibold text-sky-700" href="/scheduling/rotations">← Back to Rotations</Link><header><h1 className="text-3xl font-bold">Create recurring rotation</h1><p className="mt-2 text-slate-600">Choose a readable weekday and the recurrence details. Monthly week selection appears only for monthly rotations.</p></header><section className="rounded-xl border bg-white p-5 shadow-sm"><CreateRotationForm candidates={candidates} /></section></div>; }
