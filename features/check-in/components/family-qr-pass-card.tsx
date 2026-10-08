"use client";

import { useActionState } from "react";
import { QRCodeSVG } from "qrcode.react";

import { issueFamilyTokenAction } from "@/features/check-in/actions/check-in-actions";

import type { CheckInActionState } from "@/features/check-in/types/check-in";

const initialState: CheckInActionState = {
  success: false,
};

export function FamilyQrPassCard({
  householdId,
  householdName,
}: Readonly<{
  householdId: string;
  householdName: string;
}>) {
  const [state, action, pending] = useActionState(
    issueFamilyTokenAction,
    initialState,
  );

  const appUrl = process.env.NEXT_PUBLIC_APP_URL;

  const qrValue =
  state.token && appUrl
    ? `${appUrl}/check-in/pass#pass=${encodeURIComponent(state.token)}`
    : state.token ?? "";

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div>
        <p className="text-sm font-semibold text-sky-700">
          Family check-in
        </p>

        <h3 className="mt-1 text-lg font-bold text-slate-950">
          Family QR pass
        </h3>

        <p className="mt-2 text-sm leading-6 text-slate-600">
          Create a reusable QR pass for {householdName}. The pass identifies
          this household for check-in lookup only. Staff still confirm each
          student check-in and all pickup actions.
        </p>
      </div>

      {!state.token ? (
        <form action={action} className="mt-4">
          <input
            name="householdId"
            type="hidden"
            value={householdId}
          />

          <button
            className="min-h-11 rounded-lg bg-sky-700 px-4 font-semibold text-white disabled:opacity-60"
            disabled={pending}
          >
            {pending
              ? "Creating pass…"
              : "Create family QR pass"}
          </button>

          <p className="mt-2 text-xs text-slate-500">
            Creating a new pass replaces any existing active pass for this
            household.
          </p>
        </form>
      ) : null}

      {state.message ? (
        <div
          className={
            state.success
              ? "mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900"
              : "mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-800"
          }
          role={state.success ? "status" : "alert"}
        >
          {state.message}
        </div>
      ) : null}

      {state.token ? (
        <div className="mt-5">
          <div className="grid gap-5 lg:grid-cols-[auto_1fr] lg:items-start">
            <div className="flex justify-center rounded-xl border border-slate-200 bg-white p-5">
              <QRCodeSVG
                value={qrValue}
                size={220}
                level="M"
                includeMargin
                aria-label={`Family QR pass for ${householdName}`}
              />
            </div>

            <div className="space-y-4">
              <div>
                <h4 className="font-bold text-slate-950">
                  {householdName} family pass
                </h4>

                <p className="mt-1 text-sm leading-6 text-slate-600">
                  This QR can be kept on a parent&apos;s phone, a child&apos;s
                  phone, or printed for the family.
                </p>
              </div>

              <div className="rounded-lg border border-sky-200 bg-sky-50 p-4">
                <p className="text-sm font-semibold text-sky-950">
                  What this QR does
                </p>

                <p className="mt-1 text-sm leading-6 text-sky-900">
                  It identifies the household so staff can open the family
                  during check-in. It does not automatically check in a child
                  and does not authorize pickup.
                </p>
              </div>

              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-semibold text-slate-900">
                  QR link
                </p>

                <p className="mt-2 break-all font-mono text-xs text-slate-600">
                  {qrValue}
                </p>
              </div>

              <p className="text-xs leading-5 text-slate-500">
                Save or distribute this QR now. The system stores only a secure
                hash of the pass and cannot display this same QR again later.
                Creating a replacement pass will revoke this one.
              </p>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}