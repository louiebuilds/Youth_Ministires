import type { ReactNode } from "react";

type AppShellProps = Readonly<{
  children: ReactNode;
  header?: ReactNode;
  sidebar?: ReactNode;
}>;

export function AppShell({
  children,
  header,
  sidebar,
}: AppShellProps) {
  return (
    <div className="min-h-screen bg-slate-100 text-slate-950">
      <a
        className="sr-only fixed left-4 top-4 z-50 rounded-md bg-slate-950 px-4 py-2 text-sm font-semibold text-white shadow-lg focus:not-sr-only"
        href="#main-content"
      >
        Skip to main content
      </a>

      <div className="flex min-h-screen">
        {sidebar}

        <div className="flex min-w-0 flex-1 flex-col">
          {header}

          <main className="flex-1" id="main-content" tabIndex={-1}>
            <div className="mx-auto w-full max-w-screen-2xl px-4 py-6 sm:px-6 lg:px-8">
              {children}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
