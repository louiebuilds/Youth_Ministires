import type { Metadata } from "next";

import { getFamilyCheckinInstructions } from "@/features/administration/services/ministry-settings-service";
import { requireCapability } from "@/features/auth/services/authorization-service";
import { FamilyCheckInPass } from "@/features/check-in/components/family-check-in-pass";
import { getActiveFamilyToken } from "@/features/check-in/services/check-in-service";
import { listAccessibleFamilies } from "@/features/members/services/family-directory-service";

export const metadata: Metadata = {
  title: "Family Check-In Pass",
};

export default async function FamilyCheckInPage() {
  await requireCapability("families.view");

  const [result, familyCheckinInstructions] = await Promise.all([
    listAccessibleFamilies(null),
    getFamilyCheckinInstructions(),
  ]);

  const families =
    result.success
      ? result.families
      : [];

  const familyPassEntries =
    await Promise.all(
      families.map(async (family) => {
        const token =
          await getActiveFamilyToken(
            family.householdId,
          );

        return [
          family.householdId,
          token,
        ] as const;
      }),
    );

  const familyPasses =
    Object.fromEntries(
      familyPassEntries,
    ) as Record<string, string | null>;

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <header>
        <p className="text-sm font-semibold text-sky-700">
          Family
        </p>

        <h1 className="mt-1 text-3xl font-bold text-slate-950">
          Check-in pass
        </h1>

        <p className="mt-2 text-slate-600">
          Use your reusable family QR
          pass when arriving for youth
          events. Staff scans the pass to
          find your household, then
          confirms which children are
          checking in.
        </p>
      </header>

      {families.length > 0 ? (
        <FamilyCheckInPass
          families={families}
          familyPasses={familyPasses}
          instructions={familyCheckinInstructions}
        />
      ) : (
        <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
          No family is linked to this
          account. Ask a ministry
          administrator or Youth Pastor
          to connect your account.
        </p>
      )}

      <section className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
        <p className="font-semibold text-slate-900">
          About your family pass
        </p>

        <p className="mt-2">
          Your QR pass identifies your
          household only. It does not
          automatically check anyone in,
          authorize pickup, or replace
          staff review of care
          information.
        </p>

        <p className="mt-2">
          The same pass can be kept on a
          parent or child&apos;s phone or
          printed for future events.
        </p>
      </section>
    </div>
  );
}
