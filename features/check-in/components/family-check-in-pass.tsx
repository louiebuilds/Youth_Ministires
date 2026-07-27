"use client";

import Image from "next/image";
import QRCode from "qrcode";
import { useActionState, useEffect, useState } from "react";

import { issueFamilyTokenAction } from "@/features/check-in/actions/check-in-actions";

import type { CheckInActionState } from "@/features/check-in/types/check-in";
import type { FamilyDirectoryEntry } from "@/features/members/types/family-directory";

const initialState: CheckInActionState = { success: false };

export function FamilyCheckInPass({
  families,
}: Readonly<{ families: FamilyDirectoryEntry[] }>) {
  const [state, action, pending] = useActionState(
    issueFamilyTokenAction,
    initialState,
  );
  const [qrDataUrl, setQrDataUrl] = useState("");

  useEffect(() => {
    let current = true;
    if (!state.token) {
      return;
    }
    QRCode.toDataURL(state.token, {
      errorCorrectionLevel: "M",
      margin: 2,
      width: 320,
    }).then((url) => {
      if (current) setQrDataUrl(url);
    });
    return () => {
      current = false;
    };
  }, [state.token]);

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <form action={action} className="space-y-3">
        <label className="block text-sm font-semibold text-slate-700" htmlFor="householdId">
          Family
        </label>
        <select className="min-h-11 w-full rounded-lg border border-slate-300 px-3"
          id="householdId" name="householdId" required>
          {families.map((family) => (
            <option key={family.householdId} value={family.householdId}>
              {family.householdName}
            </option>
          ))}
        </select>
        <button className="min-h-11 rounded-lg bg-sky-700 px-5 font-semibold text-white disabled:opacity-60"
          disabled={pending || families.length === 0} type="submit">
          {pending ? "Creating pass…" : "Create 15-minute pass"}
        </button>
      </form>

      {state.message ? (
        <p className={`mt-4 text-sm font-semibold ${
          state.success ? "text-emerald-700" : "text-red-700"
        }`}>
          {state.message}
        </p>
      ) : null}

      {qrDataUrl && state.token ? (
        <div className="mt-5 border-t border-slate-200 pt-5 text-center">
          <Image alt="One-use family check-in QR pass" className="mx-auto"
            height={320} src={qrDataUrl} unoptimized width={320} />
          <p className="mt-3 text-sm font-semibold text-slate-800">
            Show this pass to an authorized check-in volunteer.
          </p>
          <details className="mt-3 text-left">
            <summary className="cursor-pointer text-sm text-slate-600">
              Scanner fallback value
            </summary>
            <p className="mt-2 break-all rounded-lg bg-slate-100 p-3 font-mono text-xs">
              {state.token}
            </p>
          </details>
        </div>
      ) : null}
    </section>
  );
}
