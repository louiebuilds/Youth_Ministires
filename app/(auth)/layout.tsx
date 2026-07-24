import { ShieldCheck } from "lucide-react";

export default function AuthenticationLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <main className="grid min-h-screen bg-slate-50 lg:grid-cols-[minmax(20rem,0.85fr)_minmax(32rem,1.15fr)]">
      <section className="relative overflow-hidden bg-slate-950 px-5 py-5 text-white sm:px-8 lg:flex lg:flex-col lg:justify-between lg:px-14 lg:py-14">
        <div
          aria-hidden="true"
          className="absolute -left-24 top-1/3 h-72 w-72 rounded-full bg-sky-500/15 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-indigo-500/20 blur-3xl"
        />

        <div className="relative flex items-center gap-3">
          <span className="flex size-11 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/15">
            <ShieldCheck aria-hidden="true" className="size-6" />
          </span>
          <div>
            <p className="text-sm font-semibold tracking-wide text-sky-200">
              Youth Ministries
            </p>
            <p className="text-lg font-semibold">Platform</p>
          </div>
        </div>

        <div className="relative mt-24 hidden max-w-lg lg:block">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-300">
            Ministry made safer
          </p>
          <p className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl lg:text-5xl">
            Supporting every student, family, and ministry leader.
          </p>
          <p className="mt-5 max-w-md text-base leading-7 text-slate-300 sm:text-lg">
            A secure place to coordinate ministry activities, attendance, and
            family communication with care.
          </p>
        </div>

        <p className="relative mt-16 hidden text-sm leading-6 text-slate-400 lg:block">
          Access is limited to authorized ministry participants.
        </p>
      </section>

      <section className="flex items-center justify-center px-5 py-10 sm:px-8 lg:px-12">
        <div className="w-full max-w-md">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            {children}
          </div>
          <p className="mt-6 text-center text-xs leading-5 text-slate-500">
            Protected ministry information should only be accessed on trusted
            devices.
          </p>
        </div>
      </section>
    </main>
  );
}
