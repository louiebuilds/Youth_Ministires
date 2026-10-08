import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Family Check-In Pass",
};

export default function FamilyCheckInPassPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl items-center px-6 py-12">
      <section className="w-full rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-sm font-semibold text-sky-700">
          Youth Ministry Check-In
        </p>

        <h1 className="mt-2 text-3xl font-bold text-slate-950">
          Family Check-In Pass
        </h1>

        <p className="mt-4 text-lg leading-8 text-slate-700">
          This QR is your family&apos;s reusable check-in pass.
        </p>

        <div className="mt-6 rounded-xl border border-sky-200 bg-sky-50 p-5">
          <h2 className="font-bold text-sky-950">
            Bring this QR to check-in
          </h2>

          <p className="mt-2 text-sm leading-6 text-sky-900">
            A ministry staff member will scan the QR to find your household,
            then confirm which children are checking in.
          </p>
        </div>

        <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-5">
          <h2 className="font-bold text-slate-950">
            What this pass does
          </h2>

          <p className="mt-2 text-sm leading-6 text-slate-700">
            The pass identifies your household for check-in lookup. It does
            not automatically check anyone in and does not authorize a child
            to be picked up.
          </p>
        </div>

        <p className="mt-6 text-sm leading-6 text-slate-500">
          You can keep this QR on a parent&apos;s phone, a child&apos;s phone,
          or use a printed copy provided by the ministry.
        </p>
      </section>
    </main>
  );
}