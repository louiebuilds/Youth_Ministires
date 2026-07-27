import type { Metadata } from "next";

import { requireCapability } from "@/features/auth/services/authorization-service";
import { FamilyCheckInPass } from "@/features/check-in/components/family-check-in-pass";
import { listAccessibleFamilies } from "@/features/members/services/family-directory-service";

export const metadata: Metadata = { title: "Family Check-In Pass" };

export default async function FamilyCheckInPage() {
  await requireCapability("families.view");
  const result = await listAccessibleFamilies(null);
  const families = result.success ? result.families : [];

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <header>
        <p className="text-sm font-semibold text-sky-700">Family</p>
        <h1 className="mt-1 text-3xl font-bold text-slate-950">
          Check-in pass
        </h1>
        <p className="mt-2 text-slate-600">
          Create a short-lived, one-use QR pass that helps an authorized
          volunteer find your family. It does not check anyone in or authorize pickup.
        </p>
      </header>
      <FamilyCheckInPass families={families} />
      <section className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
        Staff must still review care alerts and confirm every check-in or check-out.
        If the pass expires, create a new one.
      </section>
    </div>
  );
}
