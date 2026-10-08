import type { Metadata } from "next";
import Link from "next/link";

import { AdministrationAccountForm } from "@/features/auth/components/administration-account-form";
import { requireCapability } from "@/features/auth/services/authorization-service";
import { listManagedAccounts } from "@/features/auth/services/account-management-service";

export const metadata: Metadata = {
  title: "Accounts",
};

type AccountsPageProps = {
  searchParams: Promise<{
    search?: string | string[];
  }>;
};

export default async function AccountsPage({
  searchParams,
}: AccountsPageProps) {
  const currentAccount = await requireCapability("administration.manage");

  const parameters = await searchParams;
  const searchValue = Array.isArray(parameters.search)
    ? parameters.search[0] ?? ""
    : parameters.search ?? "";
  const search = searchValue.trim();
  const result = await listManagedAccounts(search);

  return (
    <div className="space-y-8">
      <header>
        <p className="text-sm font-semibold text-sky-700">Administration</p>
        <h1 className="mt-1 text-3xl font-bold text-slate-950">Accounts</h1>
        <p className="mt-2 text-slate-600">
          Manage ministry user accounts, roles, and account status.
        </p>

        <Link
          className="mt-4 inline-flex min-h-11 items-center rounded-lg border border-slate-300 px-4 font-semibold text-slate-700 hover:bg-slate-50"
          href="/administration"
        >
          Back to Administration
        </Link>
      </header>

      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <form className="flex flex-wrap items-end gap-3">
          <label
            className="min-w-64 flex-1 text-sm font-semibold text-slate-800"
            htmlFor="account-search"
          >
            Search accounts
            <input
              className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3 text-slate-950"
              defaultValue={search}
              id="account-search"
              name="search"
              placeholder="Search by name or email"
              type="search"
            />
          </label>
          <button
            className="min-h-11 rounded-lg bg-slate-900 px-5 font-semibold text-white hover:bg-slate-800"
            type="submit"
          >
            Search
          </button>
          {search ? (
            <Link
              className="inline-flex min-h-11 items-center rounded-lg border border-slate-300 px-4 font-semibold text-slate-700 hover:bg-slate-50"
              href="/administration/accounts"
            >
              Clear
            </Link>
          ) : null}
        </form>
      </section>

      {!result.success ? (
        <section
          className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-amber-950"
          role="alert"
        >
          <h2 className="font-bold">Accounts could not be loaded</h2>
          <p className="mt-1 text-sm">
            {result.reason === "denied"
              ? "You do not have permission to view managed accounts."
              : "Account management is temporarily unavailable. Please try again."}
          </p>
        </section>
      ) : result.accounts.length === 0 ? (
        <section className="rounded-xl border border-slate-200 bg-white p-5 text-slate-600 shadow-sm">
          No accounts match this search.
        </section>
      ) : (
        <section
          aria-label="Managed accounts"
          className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
        >
          <div className="hidden gap-4 border-b border-slate-200 bg-slate-50 px-4 py-3 text-xs font-bold uppercase tracking-wide text-slate-500 md:grid md:grid-cols-[minmax(0,1.25fr)_minmax(0,1.75fr)_minmax(9rem,1fr)_7rem_minmax(17rem,auto)]">
            <span>Display name</span>
            <span>Email</span>
            <span>Primary role</span>
            <span>Status</span>
            <span className="sr-only">Actions</span>
          </div>
          <div className="divide-y divide-slate-200">
            {result.accounts.map((account) => (
              <AdministrationAccountForm
                account={account}
                currentProfileId={currentAccount.id}
                currentRole={currentAccount.role}
                key={account.id}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
