import type { Metadata } from "next";

import { ManagedAccountForm } from "@/features/auth/components/managed-account-form";
import { accountSearchSchema } from "@/features/auth/schemas/account-management-schema";
import { listManagedAccounts } from "@/features/auth/services/account-management-service";
import { requireCapability } from "@/features/auth/services/authorization-service";

export const metadata: Metadata = {
  title: "Account management",
};

export default async function SettingsPage({
  searchParams,
}: Readonly<{
  searchParams: Promise<{ q?: string | string[] }>;
}>) {
  const account = await requireCapability("accounts.manage");
  const queryValue = (await searchParams).q;
  const parsedSearch = accountSearchSchema.safeParse(
    typeof queryValue === "string" ? queryValue : "",
  );
  const search = parsedSearch.success ? parsedSearch.data : "";
  const result = await listManagedAccounts(search);

  return (
    <div className="space-y-8">
      <section aria-labelledby="account-management-heading">
        <p className="text-sm font-semibold text-sky-700">Administration</p>
        <h1
          className="mt-1 text-3xl font-bold tracking-tight text-slate-950"
          id="account-management-heading"
        >
          Account management
        </h1>
        <p className="mt-2 max-w-3xl text-base leading-7 text-slate-600">
          Search existing accounts and maintain their display name, permanent
          role, and lifecycle status. Every change is audited.
        </p>
      </section>

      <section
        aria-label="Search accounts"
        className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
      >
        <form className="flex flex-col gap-3 sm:flex-row" method="get">
          <label className="sr-only" htmlFor="account-search">
            Search by name or email
          </label>
          <input
            className="min-h-11 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-base outline-none focus:border-sky-600 focus:ring-3 focus:ring-sky-100"
            defaultValue={search}
            id="account-search"
            maxLength={100}
            name="q"
            placeholder="Search by name or email"
            type="search"
          />
          <button
            className="min-h-11 rounded-lg bg-slate-900 px-5 py-2 text-sm font-semibold text-white hover:bg-slate-700"
            type="submit"
          >
            Search
          </button>
        </form>
        {!parsedSearch.success ? (
          <p className="mt-3 text-sm text-red-700">
            Search must be 100 characters or fewer.
          </p>
        ) : null}
      </section>

      {!result.success ? (
        <section className="rounded-xl border border-red-200 bg-red-50 p-5 text-red-900">
          Account management is temporarily unavailable. Please refresh and try
          again.
        </section>
      ) : result.accounts.length === 0 ? (
        <section className="rounded-xl border border-slate-200 bg-white p-8 text-center">
          <h2 className="font-semibold text-slate-950">No accounts found</h2>
          <p className="mt-2 text-sm text-slate-600">
            Try a different display name or email address.
          </p>
        </section>
      ) : (
        <section aria-label="Existing accounts" className="space-y-4">
          <p className="text-sm text-slate-600">
            Showing {result.accounts.length} existing{" "}
            {result.accounts.length === 1 ? "account" : "accounts"}.
          </p>
          {result.accounts.map((managedAccount) => (
            <ManagedAccountForm
              account={managedAccount}
              currentProfileId={account.id}
              key={managedAccount.id}
            />
          ))}
        </section>
      )}

      <aside className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-950">
        This milestone manages existing accounts only. Creating sign-in
        identities and sending administrator-triggered password resets require
        a separately approved privileged identity workflow.
      </aside>
    </div>
  );
}
