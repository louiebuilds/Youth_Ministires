import { LogOut, UserRound } from "lucide-react";

import { signOutAction } from "@/features/auth/actions/sign-out-action";

type UserMenuProps = Readonly<{
  email: string;
  roleLabel: string;
}>;

export function UserMenu({ email, roleLabel }: UserMenuProps) {
  const initial = email.charAt(0).toUpperCase();

  return (
    <details className="group relative">
      <summary className="flex cursor-pointer list-none items-center gap-3 rounded-lg px-2 py-1.5 text-left hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700 [&::-webkit-details-marker]:hidden">
        <span
          aria-hidden="true"
          className="grid size-9 place-items-center rounded-full bg-sky-100 text-sm font-semibold text-sky-800"
        >
          {initial}
        </span>
        <span className="hidden min-w-0 sm:block">
          <span className="block text-xs font-medium text-slate-500">
            Signed in as
          </span>
          <span className="block max-w-56 truncate text-sm font-semibold text-slate-900">
            {email}
          </span>
        </span>
      </summary>

      <div className="absolute right-0 z-40 mt-2 w-[min(18rem,calc(100vw-2rem))] rounded-xl border border-slate-200 bg-white p-2 shadow-xl">
        <div className="flex items-start gap-3 border-b border-slate-100 px-3 py-3">
          <UserRound
            aria-hidden="true"
            className="mt-0.5 size-5 shrink-0 text-slate-500"
          />
          <div className="min-w-0">
            <p className="text-xs font-medium text-slate-500">Account</p>
            <p className="truncate text-sm font-semibold text-slate-900">
              {email}
            </p>
            <p className="mt-0.5 text-xs text-slate-500">{roleLabel}</p>
          </div>
        </div>

        <form action={signOutAction}>
          <button
            className="mt-1 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700"
            type="submit"
          >
            <LogOut aria-hidden="true" className="size-4" />
            Sign out
          </button>
        </form>
      </div>
    </details>
  );
}
