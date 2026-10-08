import type { Metadata } from "next";
import Link from "next/link";

import { requireCapability } from "@/features/auth/services/authorization-service";
import { CreateAttendanceSessionForm } from "@/features/attendance/components/attendance-management-forms";
import {
  listAttendanceEvents,
  listAttendanceSessions,
} from "@/features/attendance/services/attendance-management-service";

export const metadata: Metadata = {
  title: "Attendance",
};

type AttendanceView = "sessions" | "new";

function getView(
  value: string | string[] | undefined,
): AttendanceView {
  return value === "new"
    ? "new"
    : "sessions";
}

function WorkspaceLink({
  active,
  href,
  children,
}: {
  active: boolean;
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      className={
        active
          ? "inline-flex min-h-12 items-center border-b-2 border-sky-700 px-4 font-semibold text-sky-800"
          : "inline-flex min-h-12 items-center border-b-2 border-transparent px-4 font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-950"
      }
      href={href}
    >
      {children}
    </Link>
  );
}

export default async function AttendancePage({
  searchParams,
}: Readonly<{
  searchParams: Promise<
    Record<
      string,
      string | string[] | undefined
    >
  >;
}>) {
  await requireCapability(
    "attendance.manage",
  );

  const params = await searchParams;

  const view = getView(params.view);

  const [events, sessions] =
    await Promise.all([
      listAttendanceEvents(),
      listAttendanceSessions(),
    ]);

  return (
    <div className="space-y-8">
      <header>
        <div className="max-w-4xl">
          <p className="text-sm font-semibold text-sky-700">
            Attendance &amp; Participation
          </p>

          <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">
            Attendance
          </h1>

          <p className="mt-2 max-w-3xl text-base leading-7 text-slate-600">
            Track attendance sessions, update
            rosters, preserve corrections, and
            finalize attendance records.
          </p>
        </div>

        <nav
          aria-label="Attendance workspaces"
          className="mt-8 flex flex-wrap border-b border-slate-200"
        >
          <WorkspaceLink
            active={view === "sessions"}
            href="/attendance?view=sessions"
          >
            Sessions
          </WorkspaceLink>

          <WorkspaceLink
            active={view === "new"}
            href="/attendance?view=new"
          >
            New session
          </WorkspaceLink>
        </nav>
      </header>

      {view === "new" ? (
        <section className="space-y-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-950">
              New attendance session
            </h2>

            <p className="mt-1 text-slate-600">
              Create an attendance session for
              an existing ministry event.
            </p>
          </div>

          <CreateAttendanceSessionForm
            events={events}
          />
        </section>
      ) : (
        <section className="space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-slate-950">
                Attendance sessions
              </h2>

              <p className="mt-1 text-slate-600">
                Open a session to record or
                review attendance.
              </p>
            </div>

            <Link
              className="inline-flex min-h-11 items-center rounded-lg bg-sky-700 px-4 font-semibold text-white transition hover:bg-sky-800"
              href="/attendance?view=new"
            >
              New attendance session
            </Link>
          </div>

          {sessions.length === 0 ? (
            <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-600">
              No attendance sessions have been
              created.
            </div>
          ) : (
            <ul className="grid gap-4 lg:grid-cols-2">
              {sessions.map((session) => (
                <li
                  className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
                  key={session.sessionId}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-semibold text-slate-950">
                        {session.className}
                      </h3>

                      <p className="mt-1 text-sm text-slate-600">
                        {session.eventName} ·{" "}
                        {session.sessionDate}
                      </p>
                    </div>

                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                        session.finalizedAt
                          ? "bg-slate-100 text-slate-700"
                          : "bg-emerald-100 text-emerald-800"
                      }`}
                    >
                      {session.finalizedAt
                        ? "Finalized"
                        : "Open"}
                    </span>
                  </div>

                  <dl className="mt-4 grid grid-cols-4 gap-2 text-center text-xs">
                    <div>
                      <dt className="text-slate-500">
                        Present
                      </dt>

                      <dd className="text-lg font-semibold">
                        {session.presentCount}
                      </dd>
                    </div>

                    <div>
                      <dt className="text-slate-500">
                        Absent
                      </dt>

                      <dd className="text-lg font-semibold">
                        {session.absentCount}
                      </dd>
                    </div>

                    <div>
                      <dt className="text-slate-500">
                        Excused
                      </dt>

                      <dd className="text-lg font-semibold">
                        {session.excusedCount}
                      </dd>
                    </div>

                    <div>
                      <dt className="text-slate-500">
                        Pending
                      </dt>

                      <dd className="text-lg font-semibold">
                        {session.pendingCount}
                      </dd>
                    </div>
                  </dl>

                  <Link
                    className="mt-5 inline-flex min-h-11 items-center rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
                    href={`/attendance/${session.sessionId}`}
                  >
                    Open roster
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}