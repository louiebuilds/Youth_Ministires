"use client";

import Image from "next/image";
import QRCode from "qrcode";
import {
  useEffect,
  useMemo,
  useState,
} from "react";

type FamilyCheckInPassProps = {
  families: Array<{
    householdId: string;
    householdName: string;
  }>;
  familyPasses: Record<
    string,
    string | null
  >;
  instructions: string;
};

export function FamilyCheckInPass({
  families,
  familyPasses,
  instructions,
}: Readonly<FamilyCheckInPassProps>) {
  const [selectedHouseholdId, setSelectedHouseholdId] =
    useState(
      families[0]?.householdId ?? "",
    );

  const [showQr, setShowQr] =
    useState(false);

  const [qrDataUrl, setQrDataUrl] =
    useState("");

  const selectedFamily =
    useMemo(
      () =>
        families.find(
          (family) =>
            family.householdId ===
            selectedHouseholdId,
        ) ?? null,
      [
        families,
        selectedHouseholdId,
      ],
    );

  const token =
    selectedHouseholdId
      ? familyPasses[
          selectedHouseholdId
        ] ?? null
      : null;

  useEffect(() => {
    if (!showQr || !token) {
      return;
    }

    let current = true;

    const appUrl =
      process.env
        .NEXT_PUBLIC_APP_URL;

    const qrValue = appUrl
      ? `${appUrl}/check-in/pass#pass=${encodeURIComponent(
          token,
        )}`
      : token;

    QRCode.toDataURL(qrValue, {
      errorCorrectionLevel: "M",
      margin: 2,
      width: 320,
    })
      .then((url) => {
        if (current) {
          setQrDataUrl(url);
        }
      })
      .catch(() => {
        if (current) {
          setQrDataUrl("");
        }
      });

    return () => {
      current = false;
    };
  }, [showQr, token]);

  function handleFamilyChange(
    householdId: string,
  ) {
    setSelectedHouseholdId(
      householdId,
    );
    setShowQr(false);
    setQrDataUrl("");
  }

  function handleToggleQr() {
    if (showQr) {
      setShowQr(false);
      return;
    }

    setQrDataUrl("");
    setShowQr(true);
  }

  function printPass() {
    if (!token) {
      return;
    }

    setShowQr(true);

    window.setTimeout(() => {
      window.print();
    }, 500);
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      {families.length > 1 ? (
        <div className="mb-5 print:hidden">
          <label
            className="block text-sm font-semibold text-slate-700"
            htmlFor="family-pass-household"
          >
            Family
          </label>

          <select
            className="mt-2 min-h-11 w-full rounded-lg border border-slate-300 px-3"
            id="family-pass-household"
            onChange={(event) =>
              handleFamilyChange(
                event.target.value,
              )
            }
            value={
              selectedHouseholdId
            }
          >
            {families.map(
              (family) => (
                <option
                  key={
                    family.householdId
                  }
                  value={
                    family.householdId
                  }
                >
                  {
                    family.householdName
                  }
                </option>
              ),
            )}
          </select>
        </div>
      ) : null}

      {selectedFamily ? (
        <div>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-slate-500">
                Family check-in pass
              </p>

              <h2 className="mt-1 text-xl font-bold text-slate-950">
                {
                  selectedFamily.householdName
                }
              </h2>
            </div>

            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                token
                  ? "bg-emerald-100 text-emerald-800"
                  : "bg-amber-100 text-amber-900"
              }`}
            >
              {token
                ? "Active"
                : "Not issued"}
            </span>
          </div>

          {token ? (
            <>
              <p className="mt-4 text-sm text-slate-600 print:hidden">
                {instructions}
              </p>

              <div className="mt-5 flex flex-wrap gap-3 print:hidden">
                <button
                  className="min-h-11 rounded-lg bg-sky-700 px-5 font-semibold text-white hover:bg-sky-800"
                  onClick={
                    handleToggleQr
                  }
                  type="button"
                >
                  {showQr
                    ? "Hide QR"
                    : "Show QR"}
                </button>

                <button
                  className="min-h-11 rounded-lg border border-slate-300 bg-white px-5 font-semibold text-slate-800 hover:bg-slate-50"
                  onClick={
                    printPass
                  }
                  type="button"
                >
                  Print pass
                </button>
              </div>

              {showQr ? (
                <div className="mt-6 border-t border-slate-200 pt-6 text-center print:mt-0 print:border-0 print:pt-0">
                  {qrDataUrl ? (
                    <Image
                      alt={`${selectedFamily.householdName} family check-in QR pass`}
                      className="mx-auto"
                      height={320}
                      src={
                        qrDataUrl
                      }
                      unoptimized
                      width={320}
                    />
                  ) : (
                    <div className="mx-auto flex h-80 w-80 items-center justify-center rounded-lg bg-slate-100 text-sm text-slate-500 print:hidden">
                      Preparing QR
                      pass…
                    </div>
                  )}

                  <p className="mt-4 text-lg font-bold text-slate-950">
                    {
                      selectedFamily.householdName
                    }
                  </p>

                  <p className="mt-2 text-sm text-slate-600">
                    Show this QR
                    code to an
                    authorized
                    ministry staff
                    member.
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    Household
                    identification
                    only — not pickup
                    authorization.
                  </p>

                  <p className="mt-2 hidden text-sm text-slate-600 print:block">
                    {instructions}
                  </p>
                </div>
              ) : null}
            </>
          ) : (
            <div className="mt-5 rounded-lg border border-amber-200 bg-amber-50 p-4">
              <p className="font-semibold text-amber-950">
                No reusable pass has
                been issued yet.
              </p>

              <p className="mt-1 text-sm text-amber-900">
                Ask a ministry staff
                member to issue your
                family&apos;s check-in
                pass.
              </p>
            </div>
          )}
        </div>
      ) : null}
    </section>
  );
}
